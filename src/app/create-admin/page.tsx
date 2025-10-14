"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";

export default function CreateAdminPage() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        email: "",
        first_name: "",
        last_name: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/admin/create-admin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                toast.showSuccess("สร้าง Admin สำเร็จ", "สามารถ Login ได้แล้ว");
                setCreated(true);
                setFormData({
                    username: "",
                    password: "",
                    email: "",
                    first_name: "",
                    last_name: ""
                });
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถสร้าง Admin ได้");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-flex tw-items-center tw-justify-center tw-px-6">
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-8 tw-w-full tw-max-w-md">
                <div className="tw-text-center tw-mb-8">
                    <h1 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-to-indigo-600 tw-bg-clip-text tw-text-transparent">
                        สร้าง Admin
                    </h1>
                    <p className="tw-text-gray-600 tw-mt-2">
                        สร้างบัญชี Admin สำหรับระบบ
                    </p>
                </div>

                {!created ? (
                    <form onSubmit={handleSubmit} className="tw-space-y-6">
                        <div>
                            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                                placeholder="ชื่อผู้ใช้"
                            />
                        </div>

                        <div>
                            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                                placeholder="รหัสผ่าน"
                            />
                        </div>

                        <div>
                            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                อีเมล
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                                placeholder="อีเมล"
                            />
                        </div>

                        <div>
                            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                ชื่อ
                            </label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                                placeholder="ชื่อ"
                            />
                        </div>

                        <div>
                            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                นามสกุล
                            </label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-transparent tw-transition-all"
                                placeholder="นามสกุล"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold"
                            colorClass="tw-bg-gradient-to-r tw-from-blue-600 tw-to-indigo-600 hover:tw-from-blue-700 hover:tw-to-indigo-700 tw-text-white"
                        >
                            {loading ? "กำลังสร้าง..." : "สร้าง Admin"}
                        </Button>
                    </form>
                ) : (
                    <div className="tw-text-center tw-space-y-6">
                        <div className="tw-w-16 tw-h-16 tw-bg-green-100 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto">
                            <svg className="tw-w-8 tw-h-8 tw-text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="tw-text-xl tw-font-bold tw-text-green-600">สร้าง Admin สำเร็จ!</h2>
                    </div>
                )}

                <div className="tw-mt-6 tw-p-4 tw-bg-blue-50 tw-rounded-xl">
                    <h3 className="tw-text-sm tw-font-medium tw-text-blue-800 tw-mb-2">
                        ข้อมูลสำหรับ Login:
                    </h3>
                    <p className="tw-text-sm tw-text-blue-700">
                        <strong>Username:</strong> {formData.username || "[username ที่กรอก]"}<br />
                        <strong>Password:</strong> รหัสผ่านที่กรอกด้านบน
                    </p>
                    <p className="tw-text-xs tw-text-blue-600 tw-mt-2">
                        💡 Admin ใช้ Username login (ไม่ใช่ National ID)
                    </p>
                </div>

                <div className="tw-mt-4 tw-text-center">
                    <p className="tw-text-sm tw-text-gray-600">
                        หลังจากสร้างแล้ว สามารถ{" "}
                        <a href="/login" className="tw-text-blue-600 hover:tw-underline">
                            Login ด้วย Username
                        </a>{" "}
                        ได้เลย
                    </p>
                </div>
            </div>
        </div>
    );
}