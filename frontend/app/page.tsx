
"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = "http://localhost:8000";


export default function Dashboard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [authVersion, setAuthVersion] = useState(0);
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem("mycloud_user");
    localStorage.removeItem("mycloud_pass");
    setFiles([]); // clear files immediately
    setAuthVersion((v) => v + 1); // trigger refetch
    router.push("/login");
  };

  const getAuthHeader = () => {
    const username = localStorage.getItem("mycloud_user") || "";
    const password = localStorage.getItem("mycloud_pass") || "";
    return "Basic " + btoa(`${username}:${password}`);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/files`, {
        headers: {
          Authorization: getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) {
      setError("Failed to fetch files");
    }
  };

  useEffect(() => {
    // Only run in browser
    if (typeof window !== "undefined") {
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authVersion]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInput.current?.files?.length) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", fileInput.current.files[0]);
    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error("Upload failed");
      await fetchFiles();
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/delete/${filename}`, {
        method: "DELETE",
        headers: {
          Authorization: getAuthHeader(),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Delete failed");
        return;
      }
      // Remove the file from the UI immediately
      setFiles((prev) => prev.filter((f) => f !== filename));
    } catch (e) {
      setError("Delete failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative w-full">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow"
      >
        Logout
      </button>
      <h1 className="text-3xl font-bold mb-6">MyCloud Dashboard</h1>
      <form onSubmit={handleUpload} className="flex gap-4 mb-8">
        <input type="file" ref={fileInput} className="border p-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="w-full max-w-xl">
        <h2 className="text-xl font-semibold mb-2">Files</h2>
        <ul className="border rounded divide-y">
          {files.length === 0 && <li className="p-4 text-gray-500">No files uploaded.</li>}
          {files.map((filename) => (
            <li key={filename} className="flex items-center justify-between p-4">
              <span>{filename}</span>
              <div className="flex gap-2">
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    setError("");
                    try {
                      const res = await fetch(`${BACKEND_URL}/download/${filename}`, {
                        headers: {
                          Authorization: getAuthHeader(),
                        },
                      });
                      if (!res.ok) throw new Error("Download failed");
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (e) {
                      setError("Download failed");
                    }
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDelete(filename)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
