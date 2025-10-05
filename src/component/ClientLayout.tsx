"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavbarPaths = ["/login", "/register","/forgot-password"];
  const shouldHideNavbar = hideNavbarPaths.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col">
      {!shouldHideNavbar && (
        <header className="sticky top-0 z-50 shadow-sm">
          <Navbar />
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
