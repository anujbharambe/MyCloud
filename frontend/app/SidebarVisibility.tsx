"use client";
import { usePathname } from "next/navigation";
import SidebarMenuWrapper from "./SidebarMenuWrapper";

export default function SidebarVisibility() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <SidebarMenuWrapper />;
}
