"use client";
import { usePathname } from "next/navigation";
import ChatbotWidget from "./ChatbotWidget";

export default function ChatbotVisibility() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <ChatbotWidget />;
}
