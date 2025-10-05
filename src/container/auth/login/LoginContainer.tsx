"use client";

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";

export default function LoginContainner() {
    const [username, setuserName] = useState('');
    const [password, setPassword] = useState('');


    return (
        <div className="mx-4 my-4 ">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-4 mt-[60px]">
                เข้าสู่ระบบ
            </h2>


            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                <div>
                    <InputField
                        type="text"
                        placeholder="กรอกรหัสนิสิตหรือรหัสบัตรประชาชน"
                        value={username}
                        maxLength={13}
                        onChange={(val) => setuserName(val as string)}
                        required
                    />

                </div>
                <div>
                    <InputField
                        type="password"
                        placeholder="กรอกรหัสผ่าน"
                        value={password}
                        onChange={(val) => setPassword(val as string)}
                        required
                    />
                </div>

                <div className="flex justify-end">
                    <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                    >
                        ลืมรหัสผ่าน?
                    </Link>
                </div>

                <div className="flex justify-center">
                    <Button
                        className="w-full sm:w-1/2 h-12 text-lg font-semibold shadow-md"
                        colorClass="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                    >
                        เข้าสู่ระบบ
                    </Button>
                </div>

                {/* Divider */}
                <div className="relative mt-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-sm text-gray-400"></span>
                    </div>
                </div>

                {/* Register */}
                <div className="flex justify-center items-center text-sm font-medium text-gray-700">
                    <span className="mr-2">ยังไม่มีบัญชีผู้ใช้?</span>
                    <Link
                        href="/register"
                        className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                    >
                        ลงทะเบียน
                    </Link>
                </div>

            </div>
        </div>
    );
}