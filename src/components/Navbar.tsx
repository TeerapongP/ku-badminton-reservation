"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";

type Item = { id: string; label: string; href: string };

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setOpen(false);
  }, [pathname]);

  const menuItems: Item[] = useMemo(
    () => [
      { id: "home", label: "หน้าแรก", href: "/" },
      { id: "booking", label: "จองสนาม", href: "/badminton-court" },
      { id: "register", label: "สมัครสมาชิก", href: "/register" },
      { id: "login", label: "เข้าสู่ระบบ", href: "/login" },
      { id: "contract", label: "ติดต่อสอบถาม", href: "/contract" },
    ],
    []
  );

  // แทนที่ isActive() ด้วยฟังก์ชันนี้
  const getActiveId = () => {
    if (!mounted) return null;

    const current = (pathname ?? "").replace(/\/+$/, "") || "/";

    // จัดลำดับความสำคัญให้แมตช์ได้เพียงหนึ่งเดียว
    if (current === "/") return "home";

    // กลุ่มเส้นทางที่ถือว่าเป็น "จองสนาม"
    if (
      current.startsWith("/badminton-court") ||
      current.startsWith("/courts") ||
      current.startsWith("/courts-booking")
    ) {
      return "booking";
    }

    if (current.startsWith("/register")) return "register";
    if (current.startsWith("/login")) return "login";

    return null;
  };
  const activeId = getActiveId();
  return (
    <nav className="tw-bg-[#212A37] tw-text-white tw-sticky tw-top-0 tw-z-50 tw-shadow-sm">
      <div className="tw-mx-auto tw-px-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-h-16">
          <Link
            href="/"
            prefetch
            className="tw-flex tw-items-center tw-gap-2 tw-group tw-no-underline tw-text-white visited:tw-text-white"
          >
            <span className="tw-text-2xl tw-font-extrabold tw-tracking-tight">
              <span className="tw-text-cyan-300">KU</span>
            </span>
            <span className="tw-text-lg tw-text-cyan-100/90">court booking</span>
          </Link>

          <div className="tw-hidden md:tw-flex tw-items-center tw-gap-3 tw-ml-auto">
            {menuItems.map((item) => {
              const active = item.id === activeId;
              const base =
                "tw-px-4 tw-py-2 tw-rounded-lg tw-transition-all tw-duration-200 tw-no-underline tw-text-white visited:tw-text-white focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-cyan-500/40";
              const state = active
                ? "tw-bg-gray-700/60"
                : "hover:tw-bg-gray-700/60 tw-text-gray-200 hover:tw-text-white";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch
                  className={`${base} ${state}`}
                  aria-current={active ? "page" : undefined}
                  suppressHydrationWarning
                >
                  {item.label}
                </Link>
              );
            })}

            <Link
              href="/profile"
              prefetch
              className="tw-ml-2 tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-rounded-lg tw-transition hover:tw-bg-gray-700/60 tw-no-underline tw-text-white visited:tw-text-white focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-cyan-500/40"
            >
              <div className="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-600 tw-flex tw-items-center tw-justify-center tw-overflow-hidden">
                <User size={18} className="tw-text-cyan-300" />
              </div>
              <span className="tw-hidden lg:tw-inline tw-text-sm tw-text-cyan-100/80">
                โปรไฟล์
              </span>
            </Link>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="
              md:tw-hidden tw-relative tw-ml-auto tw-flex tw-items-center tw-justify-center
              tw-w-11 tw-h-11 tw-rounded-2xl
              tw-bg-gradient-to-br tw-from-gray-700/50 tw-to-gray-800/50
              hover:tw-from-cyan-600/30 hover:tw-to-blue-600/30
              tw-backdrop-blur-sm tw-transition-all tw-duration-500 tw-ease-out
              tw-shadow-[0_0_20px_rgba(56,189,248,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
              hover:tw-shadow-[0_0_30px_rgba(56,189,248,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]
              tw-border tw-border-cyan-400/20 hover:tw-border-cyan-400/40
              tw-text-cyan-300 hover:tw-text-cyan-100 focus:tw-outline-none
              focus:tw-ring-2 focus:tw-ring-cyan-500/60 focus:tw-ring-offset-2 focus:tw-ring-offset-gray-900
              active:tw-scale-95 tw-group
            "
          >
            <span className="tw-absolute tw-inset-0 tw-rounded-2xl tw-bg-gradient-to-br tw-from-cyan-400/0 tw-to-blue-400/0 group-hover:tw-from-cyan-400/10 group-hover:tw-to-blue-400/10 tw-transition-all tw-duration-500" />
            <span
              className={`
                tw-relative tw-z-10 tw-transition-all tw-duration-500 tw-ease-out
                ${open ? "tw-rotate-180 tw-scale-110" : "tw-rotate-0 tw-scale-100"}
                group-hover:tw-scale-110
              `}
            >
              {open ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`md:tw-hidden tw-overflow-hidden tw-transition-[max-height,opacity] tw-duration-300 tw-ease-in-out ${open ? "tw-max-h-96 tw-opacity-100" : "tw-max-h-0 tw-opacity-0"
          }`}
      >
        <div className="tw-bg-[#1a2332] tw-border-t tw-border-white/10">
          {menuItems.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch
                className={`tw-block tw-px-6 tw-py-3 tw-border-l-4 tw-transition-all tw-duration-200 tw-no-underline ${active
                  ? "tw-bg-gray-700/60 tw-border-cyan-400 tw-text-cyan-200 tw-font-medium visited:tw-text-cyan-200"
                  : "tw-border-transparent hover:tw-bg-gray-700/40 tw-text-white visited:tw-text-white"
                  }`}
                aria-current={active ? "page" : undefined}
                suppressHydrationWarning
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/profile"
            prefetch
            className="tw-flex tw-items-center tw-gap-3 tw-px-6 tw-py-3 hover:tw-bg-gray-700/40 tw-border-t tw-border-white/10 tw-no-underline tw-text-white visited:tw-text-white"
          >
            <div className="tw-w-9 tw-h-9 tw-rounded-full tw-bg-gray-600 tw-flex tw-items-center tw-justify-center">
              <User size={20} className="tw-text-cyan-300" />
            </div>
            <span className="tw-text-cyan-100">โปรไฟล์ของฉัน</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
