
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import os
from db import SessionLocal, User, File as DBFile, AccessLog
from passlib.hash import bcrypt
from sqlalchemy.orm import Session
import datetime


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


@app.get("/files")
def list_files(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_files = db.query(DBFile).filter_by(owner_id=user.id).all()
    files = [
        f.filename
        for f in db_files
        if os.path.exists(os.path.join(UPLOAD_DIR, f.filename))
    ]
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
