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
        <div className="sm:py-6 px-4 py-8  max-w-md mx-auto ">
            <h2 className="flex justify-center items-center text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 text-center">
                เปลี่ยนรหัสผ่าน
            </h2>
            <form
                className="space-y-4"
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
                <div className="min-h-5">
                    {error && (
                        <p className="text-red-600 text-sm" aria-live="assertive">
                            {error}
                        </p>
                    )}
                    {message && (
                        <p className="text-green-600 text-sm" aria-live="polite" role="status">
                            {message}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full sm:w-1/2 h-12 text-lg font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    colorClass="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                    disabled={loading || !email}
                >
                    {loading ? "กำลังส่ง..." : "รีเซ็ตรหัสผ่าน"}
                </Button>

                <div className="text-center mt-4">
                    <Link href="/login" className="text-emerald-600 underline">
                        กลับไปหน้าเข้าสู่ระบบ
                    </Link>
                </div>
            </form>
        </div>

    );
}
