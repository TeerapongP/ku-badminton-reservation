"use client";

import { useState } from "react";
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

export default function LoginContainner() {
    const [username, setuserName] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div className="mx-4 my-4 ">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-4">
                เข้าสู่ระบบ
            </h2>

            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                <div>
                    <InputText
                        placeholder="กรุณากรอกรหัสนิสิตหรือเลขบัตรประชาชน"
                        className="w-full  text-sm sm:text-base"
                        value={username}
                        onChange={(e) => setuserName(e.target.value)}
                    />
                </div>
                <div>
                    <InputText
                        placeholder="กรุณากรอกรหัสผ่าน"
                        className="w-full  text-sm sm:text-base"
                        value={password}
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {/* ลืมรหัสผ่าน */}
                </div>
                {/* <Button label="Submit" className="w-full bg-[#C9E4CA]" /> */}

            </div>
        </div>
    );
}