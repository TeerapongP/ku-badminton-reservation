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
    <nav className="bg-[#212A37] text-white sticky top-0 z-50 shadow-sm">
      <div className="mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ===== Logo ===== */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-cyan-300">KU</span>
            </span>
            <span className="text-lg text-cyan-100/90">court booking</span>
          </Link>

          {/* ===== Desktop Menu ===== */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              const base =
                "px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none";
              const state = active
                ? "bg-gray-700/60 text-white"
                : "hover:bg-gray-700/60";
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
              className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/60 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                {/* ถ้ามีรูปโปรไฟล์จริงใช้ Image แทนได้ */}
                {/* <Image src="/avatar.jpg" alt="Avatar" width={32} height={32} /> */}
                <User size={18} className="text-cyan-300" />
              </div>
              <span className="hidden lg:inline text-sm text-cyan-100/80">
                โปรไฟล์
              </span>
            </Link>
          </div>

          {/* ===== Mobile Toggle ===== */}
          <button
            className="md:hidden p-2 ml-auto rounded-lg hover:bg-gray-700/60"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ===== Mobile Menu ===== */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="bg-[#1a2332] border-t border-white/10">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`block px-6 py-3 border-l-4 transition-all duration-200 ${active
                  ? "bg-gray-700/60 border-cyan-400 text-cyan-200 font-medium"
                  : "border-transparent hover:bg-gray-700/40"
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
            className="flex items-center gap-3 px-6 py-3 hover:bg-gray-700/40 border-t border-white/10"
          >
            <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center">
              <User size={20} className="text-cyan-300" />
            </div>
            <span className="text-cyan-100">โปรไฟล์ของฉัน</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
