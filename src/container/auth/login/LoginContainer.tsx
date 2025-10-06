"use client";

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";

export default function LoginContainner() {
  const [username, setuserName] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="tw-mx-4 tw-my-4">
      <h2 className="tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-gray-800 tw-mb-4 sm:tw-mb-6 lg:tw-mb-4 tw-mt-[60px]">
        เข้าสู่ระบบ
      </h2>

      <div className="tw-space-y-4 sm:tw-space-y-5 lg:tw-space-y-6">
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

        <div className="tw-flex tw-justify-end">
          <Link
            href="/forgot-password"
            className="tw-text-sm tw-font-medium tw-text-emerald-600 hover:tw-text-emerald-700 tw-underline tw-underline-offset-2"
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <div className="tw-flex tw-justify-center">
          {/* <Button
            className="tw-w-full sm:tw-w-1/2 tw-h-12 tw-text-lg tw-font-semibold tw-shadow-md"
            colorClass="tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white focus:tw-ring-emerald-500"
          >
            เข้าสู่ระบบ
          </Button> */}
        </div>

        {/* Divider */}
        <div className="tw-relative tw-mt-8">
          <div className="tw-absolute tw-inset-0 tw-flex tw-items-center">
            <span className="tw-w-full tw-border-t tw-border-gray-200" />
          </div>
          <div className="tw-relative tw-flex tw-justify-center">
            <span className="tw-bg-white tw-px-3 tw-text-sm tw-text-gray-400"></span>
          </div>
        </div>

        {/* Register */}
        <div className="tw-flex tw-justify-center tw-items-center tw-text-sm tw-font-medium tw-text-gray-700">
          <span className="tw-mr-2">ยังไม่มีบัญชีผู้ใช้?</span>
          <Link
            href="/register"
            className="tw-text-emerald-600 hover:tw-text-emerald-700 tw-underline tw-underline-offset-2"
          >
            ลงทะเบียน
          </Link>
        </div>
      </div>
    </div>
  );
}
