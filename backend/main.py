
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import os
from dotenv import load_dotenv
from db import SessionLocal, User, File as DBFile, AccessLog
from passlib.hash import bcrypt
from sqlalchemy.orm import Session
import datetime
import google.generativeai as genai


app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load environment variables from .env
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment. Please set it in .env.")
genai.configure(api_key=GEMINI_API_KEY)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def log_access(db: Session, username: str, filename: str, action: str):
    user = db.query(User).filter_by(username=username).first()
    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
    file = db.query(DBFile).filter_by(filename=filename).first()
    if not file:
        file = DBFile(filename=filename, owner=user)
        db.add(file)
        db.commit()
        db.refresh(file)
    log = AccessLog(user_id=user.id, file_id=file.id, action=action, timestamp=datetime.datetime.utcnow())
    db.add(log)
    db.commit()


from fastapi import Depends, Request, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

security = HTTPBasic()
def get_current_user(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=credentials.username).first()
    if not user or not bcrypt.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return user
# User registration endpoint
@app.post("/register")
def register(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=credentials.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=credentials.username, password_hash=bcrypt.hash(credentials.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered"}

# User login endpoint (verifies credentials)
@app.post("/login")
def login(credentials: HTTPBasicCredentials = Depends(security), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=credentials.username).first()
    if not user or not bcrypt.verify(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"message": "Login successful"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    # Save file record if not exists
    db_file = db.query(DBFile).filter_by(filename=file.filename).first()
    if not db_file:
        db_file = DBFile(filename=file.filename, owner_id=user.id)
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
    log_access(db, user.username, file.filename, "upload")
    return {"filename": file.filename}


@app.get("/download/{filename}")
def download_file(
    filename: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_file = db.query(DBFile).filter_by(filename=filename, owner_id=user.id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found or not owned by user")
    file_location = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_location):
        return {"error": "File not found"}
    log_access(db, user.username, filename, "download")
    return FileResponse(file_location, filename=filename)



def classify_file(filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    if ext in ["pdf", "doc", "docx"]:
        return "document"
    if ext in ["xls", "xlsx", "csv"]:
        return "tabular"
    if ext in ["jpg", "jpeg", "png", "gif", "bmp"]:
        return "image"
    return "other"

@app.get("/files")
def list_files(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_files = db.query(DBFile).filter_by(owner_id=user.id).all()
    files = []
    for f in db_files:
        file_path = os.path.join(UPLOAD_DIR, f.filename)
        if os.path.exists(file_path):
            files.append({
                "filename": f.filename,
                "type": classify_file(f.filename)
            })
    return {"files": files}


@app.delete("/delete/{filename}")
def delete_file(
    filename: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_file = db.query(DBFile).filter_by(filename=filename, owner_id=user.id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found or not owned by user")
    file_location = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_location):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(file_location)
    db.delete(db_file)
    db.commit()
    log_access(db, user.username, filename, "delete")
    return {"detail": f"{filename} deleted"}


def search_files_content(user, db, filenames=None):
    import PyPDF2
    query_files = db.query(DBFile).filter_by(owner_id=user.id)
    if filenames:
        query_files = query_files.filter(DBFile.filename.in_(filenames))
    db_files = query_files.all()
    results = []
    for f in db_files:
        file_path = os.path.join(UPLOAD_DIR, f.filename)
        if os.path.exists(file_path):
            content = ""
            if f.filename.lower().endswith(".pdf"):
                try:
                    with open(file_path, "rb") as pdf_file:
                        reader = PyPDF2.PdfReader(pdf_file)
                        for page in reader.pages:
                            content += page.extract_text() or ""
                except Exception:
                    continue
            else:
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                except Exception:
                    continue
            results.append({"filename": f.filename, "content": content})
    return results

from fastapi import Body


@app.post("/chatbot")
async def chatbot(
    request: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = request.get("query")
    filenames = request.get("files")
    if not query:
        raise HTTPException(status_code=400, detail="Query required")

    # Ensure filenames is always a list
    if not filenames:
        filenames = []
    elif isinstance(filenames, str):
        filenames = [filenames]

    print(f"[DEBUG] Selected filenames: {filenames}")
    files_data = search_files_content(user, db, filenames)
    context = "\n\n".join(
        [f"File: {f['filename']}\nContent:\n{f['content'][:2000]}" for f in files_data]
    )
    print("[DEBUG] files_data:", files_data)
    print("[DEBUG] context sent to model:\n", context)
    prompt = (
        f"User asked: {query}\n"
        f"Here are the user's files (may be partial):\n{context}\n"
        "Answer the user's question using the files above if possible."
    )

    model = genai.GenerativeModel("gemini-2.5-pro")
    response = model.generate_content(prompt)
    answer = response.text if hasattr(response, "text") else str(response)

    return {"response": answer}