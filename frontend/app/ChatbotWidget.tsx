"use client";
import React, { useState, useEffect, useRef } from "react";

const ChatbotWidget = () => {
  const [maximized, setMaximized] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  type Message = { from: "user" | "bot"; text: string };
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "👋 Hi! I'm here to help you with any questions about your files. How can I assist you today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);

  // Remove deleted files from selectedFiles when availableFiles changes
  useEffect(() => {
    setSelectedFiles(prev => prev.filter(f => availableFiles.includes(f)));
  }, [availableFiles]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;
    setMessages((msgs) => [...msgs, { from: "user", text: query }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ query, files: selectedFiles }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { from: "bot", text: data.response }]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { from: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    }
    setQuery("");
    setLoading(false);
  };

  type KeyDownEvent = React.KeyboardEvent<HTMLTextAreaElement>;

  const handleKeyDown = (e: KeyDownEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Fetch available files when chatbot opens
  useEffect(() => {
    if (open) {
      fetch("http://localhost:8000/files", {
        method: "GET",
        credentials: "include",
      })
        .then(res => res.json())
        .then(data => {
          setAvailableFiles(data.files || []);
        })
        .catch(() => setAvailableFiles([]));
    }
  }, [open]);

  return (
    <div>
      {/* Backdrop overlay when open */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            zIndex: 999,
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        {open ? (
            <div
              style={{
                width: 380,
                height: maximized ? 'calc(100vh - 48px)' : 500,
                maxHeight: maximized ? 'calc(100vh - 48px)' : 500,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 20,
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transform: open ? "scale(1)" : "scale(0.8)",
                opacity: open ? 1 : 0,
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              }}
            >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                color: "white",
                fontWeight: "600",
                fontSize: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#4ade80",
                    animation: "pulse 2s infinite",
                  }}
                />
                AI Assistant
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{
                    background: maximized ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    color: "white",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() => setMaximized(m => !m)}
                  onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)")}
                  onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = maximized ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)")}
                  aria-label={maximized ? "Restore" : "Maximize"}
                  title={maximized ? "Restore" : "Maximize"}
                >
                  {maximized ? <span style={{fontSize:20, fontWeight:'bold'}}>&#x25A2;</span> : <span style={{fontSize:20, fontWeight:'bold'}}>&#x25A1;</span>}
                </button>
                <button
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    color: "white",
                    cursor: "pointer",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s ease",
                  }}
                  onClick={() => setOpen(false)}
                  onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.2)")}
                  onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.1)")}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                    animation: `slideIn 0.4s ease ${idx * 0.1}s both`,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: msg.from === "user" ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                      background: msg.from === "user" 
                        ? "linear-gradient(135deg, #667eea, #764ba2)"
                        : "white",
                      color: msg.from === "user" ? "white" : "#374151",
                      boxShadow: msg.from === "user" 
                        ? "0 4px 20px rgba(102, 126, 234, 0.3)"
                        : "0 2px 10px rgba(0, 0, 0, 0.1)",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      wordBreak: "break-word",
                      position: "relative",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "20px 20px 20px 6px",
                      background: "white",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#9ca3af",
                        animation: "bounce 1.4s infinite ease-in-out",
                      }}
                    />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#9ca3af",
                        animation: "bounce 1.4s infinite ease-in-out 0.16s",
                      }}
                    />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#9ca3af",
                        animation: "bounce 1.4s infinite ease-in-out 0.32s",
                      }}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & File Selection */}
            <div
              style={{
                padding: "20px",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 500, color: '#374151', marginBottom: 8, display: 'block' }}>
                  Select files for context:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 40 }}>
                  {availableFiles.length === 0 ? (
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>No files available</span>
                  ) : (
                    availableFiles.map(f => {
                      const selected = selectedFiles.includes(f);
                      return (
                        <span
                          key={f}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: selected ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f3f4f6',
                            color: selected ? 'white' : '#374151',
                            borderRadius: 16,
                            padding: '6px 14px',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            boxShadow: selected ? '0 2px 8px rgba(102,126,234,0.15)' : 'none',
                            border: selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                            marginRight: 0,
                            position: 'relative',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            if (selected) {
                              setSelectedFiles(selectedFiles.filter(sf => sf !== f));
                            } else {
                              setSelectedFiles([...selectedFiles, f]);
                            }
                          }}
                        >
                          {f}
                          {selected && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: 16,
                                lineHeight: 1,
                                color: 'white',
                                background: 'rgba(0,0,0,0.12)',
                                borderRadius: '50%',
                                width: 20,
                                height: 20,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedFiles(selectedFiles.filter(sf => sf !== f));
                              }}
                              title="Remove"
                            >
                              ×
                            </span>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#667eea', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    Selected: {selectedFiles.map(f => (
                      <span key={f} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={loading}
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      maxHeight: "120px",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "22px",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "none",
                      outline: "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      backgroundColor: "white",
                        boxSizing: "border-box",
                        color: "#222",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={loading || !query.trim()}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    border: "none",
                    background: query.trim() 
                      ? "linear-gradient(135deg, #667eea, #764ba2)"
                      : "#d1d5db",
                    color: "white",
                    cursor: query.trim() ? "pointer" : "not-allowed",
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    boxShadow: query.trim() 
                      ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (query.trim()) {
                      (e.target as HTMLElement).style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              fontSize: "24px",
              boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() => setOpen(true)}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = "scale(1.1)";
              (e.target as HTMLElement).style.boxShadow = "0 12px 40px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = "scale(1)";
              (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(102, 126, 234, 0.4)";
            }}
            aria-label="Open chatbot"
          >
            💬
            {/* Pulse ring animation */}
            <div
              style={{
                position: "absolute",
                top: "-2px",
                left: "-2px",
                right: "-2px",
                bottom: "-2px",
                borderRadius: "50%",
                border: "2px solid rgba(102, 126, 234, 0.6)",
                animation: "pulse 2s infinite",
              }}
            />
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatbotWidget;