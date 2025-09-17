"use client";

import React, { type ReactElement } from "react";

export type FileType = "document" | "tabular" | "image" | "other";
export type ClassifiedFile = {
  filename: string;
  type: FileType;
};

const CATEGORY_LABELS: Record<FileType, string> = {
  document: "Documents",
  tabular: "Tabular",
  image: "Images",
  other: "Other Files"
};

const CATEGORY_ICONS: Record<FileType, ReactElement> = {
  document: <span style={{marginRight:8}}>📄</span>,
  tabular: <span style={{marginRight:8}}>📊</span>,
  image: <span style={{marginRight:8}}>🖼️</span>,
  other: <span style={{marginRight:8}}>📁</span>
};

function getFileIcon(type: FileType): ReactElement {
  switch(type) {
    case "document": return <span style={{marginRight:6}}>📄</span>;
    case "tabular": return <span style={{marginRight:6}}>📊</span>;
    case "image": return <span style={{marginRight:6}}>🖼️</span>;
    default: return <span style={{marginRight:6}}>📁</span>;
  }
}

export default function SidebarMenu({ files, onFileClick }: {
  files: ClassifiedFile[];
  onFileClick?: (filename: string) => void;
}) {
  const grouped: Record<FileType, ClassifiedFile[]> = {
    document: [],
    tabular: [],
    image: [],
    other: []
  };
  files.forEach(f => grouped[f.type].push(f));

  return (
    <aside style={{
      width: 240,
      background: "#f8fafc",
      borderRight: "1px solid #e5e7eb",
      height: "100vh",
      padding: "0",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 100,
      overflowY: "auto",
      boxShadow: "2px 0 8px 0 #e5e7eb"
    }}>
      <div style={{
        fontWeight: 700,
        fontSize: 20,
        marginBottom: 24,
        textAlign: "center",
        color: "#3730a3",
        padding: "24px 0 12px 0",
        borderBottom: "1px solid #e5e7eb",
        background: "#eef2ff"
      }}>
        <span style={{fontSize:28, verticalAlign:"middle", marginRight:8}}>☁️</span> MyCloud Drive
      </div>
      <div style={{padding: "12px 0"}}>
      {Object.entries(CATEGORY_LABELS).map(([type, label]) => (
        <div key={type} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", fontWeight: 600, fontSize: 15, color: "#374151", marginBottom: 8, paddingLeft: 18 }}>
            {CATEGORY_ICONS[type as FileType]} {label}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {grouped[type as FileType].length === 0 ? (
              <li style={{ color: "#9ca3af", fontSize: 13, paddingLeft: 32 }}>No files</li>
            ) : (
              grouped[type as FileType].map(f => (
                <li key={f.filename}
                  style={{
                    padding: "8px 32px",
                    cursor: "pointer",
                    color: "#2563eb",
                    borderRadius: 8,
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    fontSize: 15,
                    transition: "background 0.2s, color 0.2s"
                  }}
                  onClick={() => onFileClick?.(f.filename)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#e0e7ff";
                    e.currentTarget.style.color = "#1e40af";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "";
                    e.currentTarget.style.color = "#2563eb";
                  }}
                >
                  {getFileIcon(f.type)}
                  <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{f.filename}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
      </div>
    </aside>
  );
}
