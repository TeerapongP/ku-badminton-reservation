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
          <Button
            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none"
            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
          >
            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
              เข้าสู่ระบบ
              <svg
                className="tw-w-5 tw-h-5 tw-transition-transform tw-duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </span>
          </Button>
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
