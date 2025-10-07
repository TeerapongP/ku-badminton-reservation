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
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-[#f8fdf8]">
      {!shouldHideNavbar && (
        <header
          className="
            tw-fixed tw-top-0 tw-left-0 tw-right-0
            tw-z-50 tw-shadow-sm
            tw-w-screen
            tw-ml-[calc(50%-50vw)] tw-mr-[calc(50%-50vw)]
          "
        >
          <Navbar />
        </header>
      )}

      <ToastProvider>
        <main className="tw-flex-1 tw-pt-12">{children}</main>
      </ToastProvider>
    </div>
  );
}
