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

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems: Item[] = useMemo(
    () => [
      { id: "home", label: "หน้าแรก", href: "/" },
      { id: "booking", label: "จองสนาม", href: "/badminton-court" },
      { id: "register", label: "สมัครสมาชิก", href: "/register" },
      { id: "login", label: "เข้าสู่ระบบ", href: "/login" },
    ],
    []
  );

  const isActive = (href: string) => {
    if (!mounted) return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="tw-bg-[#212A37] tw-text-white tw-sticky tw-top-0 tw-z-50 tw-shadow-sm">
      <div className="tw-mx-auto tw-px-4">
        <div className="tw-flex tw-items-center tw-justify-between tw-h-16">
          {/* ===== Logo ===== */}
          <Link href="/" className="tw-flex tw-items-center tw-gap-2 tw-group">
            <span className="tw-text-2xl tw-font-extrabold tw-tracking-tight">
              <span className="tw-text-cyan-300">KU</span>
            </span>
            <span className="tw-text-lg tw-text-cyan-100/90">court booking</span>
          </Link>

          {/* ===== Desktop Menu ===== */}
          <div className="tw-hidden md:tw-flex tw-items-center tw-gap-3 tw-ml-auto">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              const base =
                "tw-px-4 tw-py-2 tw-rounded-lg tw-transition-all tw-duration-200 focus:tw-outline-none";
              const state = active
                ? "tw-bg-gray-700/60 tw-text-white"
                : "hover:tw-bg-gray-700/60";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${base} ${state}`}
                  suppressHydrationWarning
                >
                  {item.label}
                </Link>
              );
            })}

            {/* ===== Avatar next to Login ===== */}
            <Link
              href="/profile"
              className="tw-ml-2 tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-rounded-lg hover:tw-bg-gray-700/60 tw-transition"
            >
              <div className="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-600 tw-flex tw-items-center tw-justify-center tw-overflow-hidden">
                {/* ถ้ามีรูปโปรไฟล์จริงใช้ Image แทนได้ */}
                {/* <Image src="/avatar.jpg" alt="Avatar" width={32} height={32} /> */}
                <User size={18} className="tw-text-cyan-300" />
              </div>
              <span className="tw-hidden lg:tw-inline tw-text-sm tw-text-cyan-100/80">
                โปรไฟล์
              </span>
            </Link>
          </div>

          {/* ===== Mobile Toggle ===== */}
          <button
            className="md:tw-hidden tw-p-2 tw-ml-auto tw-rounded-lg hover:tw-bg-gray-700/60"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ===== Mobile Menu ===== */}
      <div
        className={`md:tw-hidden tw-overflow-hidden tw-transition-[max-height,opacity] tw-duration-300 tw-ease-in-out ${
          open ? "tw-max-h-96 tw-opacity-100" : "tw-max-h-0 tw-opacity-0"
        }`}
      >
        <div className="tw-bg-[#1a2332] tw-border-t tw-border-white/10">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`tw-block tw-px-6 tw-py-3 tw-border-l-4 tw-transition-all tw-duration-200 ${
                  active
                    ? "tw-bg-gray-700/60 tw-border-cyan-400 tw-text-cyan-200 tw-font-medium"
                    : "tw-border-transparent hover:tw-bg-gray-700/40"
                }`}
                onClick={() => setOpen(false)}
                suppressHydrationWarning
              >
                {item.label}
              </Link>
            );
          })}

          {/* Avatar on Mobile */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="tw-flex tw-items-center tw-gap-3 tw-px-6 tw-py-3 hover:tw-bg-gray-700/40 tw-border-t tw-border-white/10"
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
