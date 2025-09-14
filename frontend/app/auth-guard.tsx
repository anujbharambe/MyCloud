"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("mycloud_user");
      const pass = localStorage.getItem("mycloud_pass");
      if ((!user || !pass) && pathname !== "/login" && pathname !== "/register") {
        router.replace("/login");
      }
    }
  }, [pathname, router]);
  return <>{children}</>;
}
