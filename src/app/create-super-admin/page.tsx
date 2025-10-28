"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/components/ToastProvider";
import Loading from "@/components/Loading";

export default function CreateSuperAdminPage() {
    const router = useRouter();
    const toast = useToast();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        first_name: "",
        last_name: ""
    });

    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [adminExists, setAdminExists] = useState(false);

    useEffect(() => {
        checkAdminExists();
    }, []);

    const checkAdminExists = async () => {
        try {
            const response = await fetch('/api/admin/create-super-admin');
            const data = await response.json();

            if (data.success) {
                setAdminExists(data.superAdminExists);
                if (data.superAdminExists) {
                    toast.showError("มี Super Admin อยู่แล้ว", "ระบบมี Super Admin อยู่แล้ว กรุณาเข้าสู่ระบบ");
                    router.push("/login");
                }
            }
        } catch (error) {
            console.error("Error checking admin:", error);
        } finally {
            setChecking(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.showError("รหัสผ่านไม่ตรงกัน", "กรุณาตรวจสอบรหัสผ่านอีกครั้ง");
            return;
        }

        if (formData.password.length < 6) {
            toast.showError("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/admin/create-super-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    email: formData.email,
                    first_name: formData.first_name,
                    last_name: formData.last_name
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.showSuccess("สร้าง Super Admin สำเร็จ", "คุณสามารถเข้าสู่ระบบได้แล้ว");
                router.push("/login");
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถสร้าง Super Admin ได้");
            }
        } catch (error) {
            console.error("Create super admin error:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <Loading
                size="lg"
                text="กำลังตรวจสอบระบบ..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (adminExists) {
        return null;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-blue-50 tw-via-indigo-50 tw-to-purple-50 tw-flex tw-items-center tw-justify-center tw-px-4">
            <div className="tw-w-full tw-max-w-md">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-8 tw-border tw-border-gray-100">
                    <div className="tw-text-center tw-mb-8">
                        <h1 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent">
                            สร้าง Super Admin
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-2">
                            สร้างบัญชี Super Admin สำหรับจัดการระบบ
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="tw-space-y-6">
                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <Input
                                label="ชื่อ"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                required
                                placeholder="ชื่อจริง"
                            />
                            <Input
                                label="นามสกุล"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                required
                                placeholder="นามสกุล"
                            />
                        </div>

                        <Input
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                            placeholder="username สำหรับเข้าสู่ระบบ"
                        />

                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="อีเมล"
                        />

                        <Input
                            label="รหัสผ่าน"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                        />

                        <Input
                            label="ยืนยันรหัสผ่าน"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            placeholder="ยืนยันรหัสผ่าน"
                        />

                        <Button
                            type="submit"
                            disabled={loading}
                            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95"
                            colorClass="tw-bg-gradient-to-r tw-from-blue-500 tw-to-purple-600 hover:tw-from-blue-600 hover:tw-to-purple-700 tw-text-white"
                        >
                            {loading ? "กำลังสร้าง..." : "สร้าง Super Admin"}
                        </Button>
                    </form>

                    <div className="tw-mt-6 tw-text-center">
                        <p className="tw-text-sm tw-text-gray-600">
                            มีบัญชีแล้ว?{" "}
                            <button
                                onClick={() => router.push("/login")}
                                className="tw-text-blue-600 hover:tw-text-blue-700 tw-font-medium"
                            >
                                เข้าสู่ระบบ
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}