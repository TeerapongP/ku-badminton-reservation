"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";

export default function AdminSetupPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [credentials, setCredentials] = useState({
        username: "admin",
        password: "admin123"
    });

    const checkUser = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/check-user');
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: "เกิดข้อผิดพลาด" });
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/update-admin-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: "เกิดข้อผิดพลาด" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            <div className="tw-max-w-2xl tw-mx-auto">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-8 tw-border tw-border-gray-100">
                    <h1 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent tw-mb-8">
                        Admin Setup & Debug
                    </h1>

                    <div className="tw-space-y-6">
                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <InputField
                                label="Username"
                                value={credentials.username}
                                onChange={(value) => setCredentials(prev => ({ ...prev, username: String(value) }))}
                                placeholder="admin"
                            />
                            <InputField
                                label="Password"
                                value={credentials.password}
                                onChange={(value) => setCredentials(prev => ({ ...prev, password: String(value) }))}
                                placeholder="admin123"
                            />
                        </div>

                        <div className="tw-flex tw-gap-4">
                            <Button
                                onClick={checkUser}
                                disabled={loading}
                                className="tw-flex-1 tw-h-12 tw-text-lg tw-font-semibold tw-rounded-xl"
                                colorClass="tw-bg-gradient-to-r tw-from-blue-500 tw-to-blue-600 hover:tw-from-blue-600 hover:tw-to-blue-700 tw-text-white"
                            >
                                {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบ User"}
                            </Button>

                            <Button
                                onClick={updatePassword}
                                disabled={loading}
                                className="tw-flex-1 tw-h-12 tw-text-lg tw-font-semibold tw-rounded-xl"
                                colorClass="tw-bg-gradient-to-r tw-from-green-500 tw-to-green-600 hover:tw-from-green-600 hover:tw-to-green-700 tw-text-white"
                            >
                                {loading ? "กำลังอัปเดต..." : "อัปเดต Password"}
                            </Button>
                        </div>

                        {result && (
                            <div className="tw-mt-8 tw-p-6 tw-bg-gray-50 tw-rounded-xl">
                                <h3 className="tw-text-lg tw-font-semibold tw-mb-4">ผลลัพธ์:</h3>
                                <pre className="tw-text-sm tw-bg-white tw-p-4 tw-rounded-lg tw-overflow-auto">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="tw-mt-8 tw-p-6 tw-bg-blue-50 tw-rounded-xl">
                            <h3 className="tw-text-lg tw-font-semibold tw-mb-4 tw-text-blue-800">วิธีใช้:</h3>
                            <ol className="tw-list-decimal tw-list-inside tw-space-y-2 tw-text-blue-700">
                                <li>กดปุ่ม "ตรวจสอบ User" เพื่อดูสถานะของ admin user</li>
                                <li>หากพบปัญหา กดปุ่ม "อัปเดต Password" เพื่อตั้งรหัสผ่านใหม่</li>
                                <li>ลองเข้าสู่ระบบด้วย username และ password ที่แสดง</li>
                            </ol>
                        </div>

                        <div className="tw-text-center">
                            <Button
                                onClick={() => window.location.href = "/login"}
                                className="tw-h-12 tw-px-8 tw-text-lg tw-font-semibold tw-rounded-xl"
                                colorClass="tw-bg-gradient-to-r tw-from-purple-500 tw-to-purple-600 hover:tw-from-purple-600 hover:tw-to-purple-700 tw-text-white"
                            >
                                ไปหน้า Login
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}