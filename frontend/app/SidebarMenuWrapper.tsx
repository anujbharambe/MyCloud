"use client";
import React from "react";
import SidebarMenu from "./SidebarMenu";

export default function SidebarMenuWrapper() {
  const [files, setFiles] = React.useState([]);
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const fetchFiles = async () => {
      const username = localStorage.getItem("mycloud_user") || "";
      const password = localStorage.getItem("mycloud_pass") || "";
      const authHeader = "Basic " + btoa(`${username}:${password}`);
      try {
        const res = await fetch("http://localhost:8000/files", {
          headers: { Authorization: authHeader },
        });
        if (!res.ok) throw new Error("Failed to fetch files");
        const data = await res.json();
        setFiles(data.files || []);
      } catch {
        setFiles([]);
      }
    };
    fetchFiles();
    const handler = () => fetchFiles();
    window.addEventListener("mycloud-files-changed", handler);
    return () => window.removeEventListener("mycloud-files-changed", handler);
  }, []);

  return (
    <>
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed",
          top: 18,
          left: open ? 250 : 10,
          zIndex: 200,
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 36,
          height: 36,
          boxShadow: "0 2px 8px #e5e7eb",
          cursor: "pointer",
          transition: "left 0.3s"
        }}
      >
        {open ? "⏴" : "☰"}
      </button>
      <div
        style={{
          transition: "transform 0.3s, box-shadow 0.3s",
          transform: open ? "translateX(0)" : "translateX(-240px)",
          boxShadow: open ? "2px 0 8px 0 #e5e7eb" : "none"
        }}
      >
        <SidebarMenu files={files} />
      </div>
    </>
  );
}
