"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";


const BACKEND_URL = "http://localhost:8000";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${username}:${password}`),
      },
    });
    if (res.ok) {
      // Store credentials in localStorage (for demo; use httpOnly cookies in production)
      localStorage.setItem("mycloud_user", username);
      localStorage.setItem("mycloud_pass", password);
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">Login to MyCloud</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Login
        </button>
        {error && <div className="text-red-600">{error}</div>}
      </form>
      <button className="mt-4 underline text-blue-600" onClick={() => router.push("/register")}>Register</button>
    </div>
  );
}
