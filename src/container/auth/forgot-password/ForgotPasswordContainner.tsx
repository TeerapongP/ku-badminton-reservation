"use client";

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";

export default function ForgotPasswordContainer() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setMessage(null);
        setError(null);

        if (!email) {
            setError("กรุณากรอกอีเมลให้ครบถ้วน");
            return;
        }

        setLoading(true);

        // try {
        //   const res = await fetch("/api/auth/forgot-password", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({ email }),
        //   });

        //   const data = await res.json();

        //   if (res.ok) {
        //     setMessage("ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
        //   } else {
        //     setError(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        //   }
        // } catch (err) {
        //   setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        // } finally {
        //   setLoading(false);
        // }
    };

    return (
        <div className="tw-sm:tw-py-6 tw-px-4 tw-py-8 tw-max-w-md tw-mx-auto">
            <h2 className="tw-flex tw-justify-center tw-items-center tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-gray-800 tw-mb-6 tw-text-center">
                เปลี่ยนรหัสผ่าน
            </h2>

            <form
                className="tw-space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (loading) return;

                    // ตรวจรูปแบบอีเมลง่าย ๆ ก่อน
                    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setError("กรุณากรอกอีเมลให้ถูกต้อง");
                        setMessage(null);
                        return;
                    }
                    handleSubmit();
                }}
            >
                <InputField
                    type="email"
                    placeholder="กรอกอีเมลสำหรับรีเซ็ตรหัสผ่าน"
                    value={email}
                    onChange={(val) => setEmail(val as string)}
                    required
                    aria-label="อีเมลสำหรับรีเซ็ตรหัสผ่าน"
                />

                {/* แถบสถานะ */}
                <div className="tw-min-h-5">
                    {error && (
                        <p className="tw-text-red-600 tw-text-sm" aria-live="assertive">
                            {error}
                        </p>
                    )}
                    {message && (
                        <p
                            className="tw-text-green-600 tw-text-sm"
                            aria-live="polite"
                            role="status"
                        >
                            {message}
                        </p>
                    )}
                </div>

                <div className="tw-flex tw-justify-center tw-mt-4">
                    <Button
                        type="submit"
                        className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none"
                        colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        disabled={loading || !email}
                    >
                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                            {loading ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
                        </span>
                    </Button>
                </div>

                <div className="tw-text-center tw-mt-4">
                    <Link href="/login" className="tw-text-emerald-600 tw-underline">
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            </form>
        </div>
    );

}
