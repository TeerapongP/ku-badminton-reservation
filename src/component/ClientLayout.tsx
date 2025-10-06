"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { ToastProvider } from "./ToastProvider";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNavbarPaths = ["/login", "/register", "/forgot-password"];
  const shouldHideNavbar = hideNavbarPaths.some((p) => pathname.startsWith(p));

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col">
      {!shouldHideNavbar && (
        <header className="tw-sticky tw-top-0 tw-z-50 tw-shadow-sm">
          <Navbar />
        </header>
      )}

      <ToastProvider>
        <main className="tw-flex-1">{children}</main>
      </ToastProvider>
    </div>
  );
}
