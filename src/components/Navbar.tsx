"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./Button";

type Item = { id: string; label: string; href: string };

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setOpen(false);
  }, [pathname]);

  const menuItems: Item[] = useMemo(() => {
    const baseItems = [
      { id: "home", label: "หน้าแรก", href: "/" },
      { id: "booking", label: "จองสนาม", href: "/badminton-court" },
    ];

    if (isAuthenticated) {
      // เมื่อ login แล้ว
      return [
        ...baseItems,
        { id: "contract", label: "ติดต่อสอบถาม", href: "/contract" },
      ];
    } else {
      // เมื่อยังไม่ login
      return [
        ...baseItems,
        { id: "register", label: "สมัครสมาชิก", href: "/register" },
        { id: "login", label: "เข้าสู่ระบบ", href: "/login" },
        { id: "contract", label: "ติดต่อสอบถาม", href: "/contract" },
      ];
    }
  }, [isAuthenticated]);

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  return (
    <nav className="tw-bg-gradient-to-r tw-from-slate-800 tw-via-slate-900 tw-to-slate-800 tw-text-white tw-sticky tw-top-0 tw-z-50 tw-shadow-lg tw-border-b tw-border-slate-700/50">
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
                ? "tw-bg-gradient-to-r tw-from-emerald-600/30 tw-to-teal-600/30 tw-text-emerald-200 tw-shadow-md"
                : "hover:tw-bg-slate-700/50 tw-text-slate-200 hover:tw-text-white hover:tw-shadow-md";
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

            {isAuthenticated && (
              <>
                <Link
                  href="/profile"
                  prefetch
                  className="tw-ml-2 tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-rounded-lg tw-transition hover:tw-bg-slate-700/50 tw-no-underline tw-text-white visited:tw-text-white focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-emerald-500/40 hover:tw-shadow-md"
                >
                  <div className="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gradient-to-br tw-from-emerald-500 tw-to-teal-600 tw-flex tw-items-center tw-justify-center tw-overflow-hidden tw-shadow-md">
                    <User size={18} className="tw-text-white" />
                  </div>
                  <span className="tw-hidden lg:tw-inline tw-text-sm tw-text-emerald-100/90">
                    โปรไฟล์
                  </span>
                </Link>
                <Button onClick={handleLogout} className="tw-w-auto tw-px-4 tw-h-10 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-base tw-font-medium tw-shadow-md tw-rounded-lg tw-transition-all tw-duration-300 hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100" colorClass="tw-bg-gradient-to-r tw-from-rose-500 tw-to-pink-600 hover:tw-from-pink-600 hover:tw-to-rose-700 tw-text-white focus:tw-ring-2 focus:tw-ring-rose-300 tw-shadow-lg hover:tw-shadow-xl" >
                  <LogOut size={16} className="tw-text-white" /> <span className="tw-text-sm tw-text-white/90">ออกจากระบบ</span>
                </Button>

              </>
            )}
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
        <div className="tw-bg-gradient-to-b tw-from-slate-900 tw-to-slate-800 tw-border-t tw-border-slate-600/30 tw-backdrop-blur-sm">
          {menuItems.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch
                className={`tw-block tw-px-6 tw-py-3 tw-border-l-4 tw-transition-all tw-duration-200 tw-no-underline ${active
                  ? "tw-bg-gradient-to-r tw-from-emerald-600/20 tw-to-teal-600/20 tw-border-emerald-400 tw-text-emerald-200 tw-font-medium visited:tw-text-emerald-200"
                  : "tw-border-transparent hover:tw-bg-slate-700/50 tw-text-slate-200 visited:tw-text-slate-200 hover:tw-text-white"
                  }`}
                aria-current={active ? "page" : undefined}
                suppressHydrationWarning
              >
                {item.label}
              </Link>
            );
          })}

          {isAuthenticated && (
            <>
              <Link
                href="/profile"
                prefetch
                className="tw-flex tw-items-center tw-gap-3 tw-px-6 tw-py-3 hover:tw-bg-slate-700/40 tw-border-t tw-border-slate-600/20 tw-no-underline tw-text-white visited:tw-text-white tw-transition-all tw-duration-200"
              >
                <div className="tw-w-9 tw-h-9 tw-rounded-full tw-bg-gradient-to-br tw-from-emerald-500 tw-to-teal-600 tw-flex tw-items-center tw-justify-center tw-shadow-md">
                  <User size={20} className="tw-text-white" />
                </div>
                <span className="tw-text-emerald-100">โปรไฟล์ของฉัน</span>
              </Link>

              <div className="tw-sticky tw-bottom-0 tw-left-0 tw-right-0 tw-bg-inherit tw-pt-2">
                <Button
                  onClick={handleLogout}
                  className="tw-block sm:tw-hidden tw-w-full tw-h-10 tw-px-4 
             tw-flex tw-items-center tw-justify-center tw-gap-2
             tw-text-sm tw-font-medium
             tw-shadow-md tw-transition-all tw-duration-300
             hover:tw-shadow-lg hover:tw-scale-[1.02] active:tw-scale-95
             tw-rounded-none tw-border-0 tw-outline-none focus:tw-outline-none
             disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                  colorClass="tw-bg-gradient-to-r tw-from-rose-500 tw-to-pink-600
              hover:tw-from-pink-600 hover:tw-to-rose-700
              tw-text-white focus:tw-ring-2 focus:tw-ring-rose-300
              tw-shadow-lg hover:tw-shadow-xl"
                >
                  <LogOut size={16} className="tw-text-white" />
                  <span className="tw-text-white/90">ออกจากระบบ</span>
                </Button>

              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
