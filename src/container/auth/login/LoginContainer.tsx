"use client";

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import bcrypt from 'bcryptjs';
import Loading from "@/components/Loading";

export default function LoginContainner() {
  const toast = useToast();
  const { login } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState(''); // รหัสนิสิตหรือบัตรประชาชน
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Validation function
  const validateForm = (): string | null => {
    if (!identifier.trim()) return "กรุณากรอกรหัสนิสิต, เลขบัตรประชาชน หรือ Username";
    if (!password) return "กรุณากรอกรหัสผ่าน";

    // ตรวจสอบรูปแบบ
    const isStudentId = /^\d{8,10}$/.test(identifier);
    const isNationalId = /^\d{13}$/.test(identifier);
    const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(identifier); // Username สำหรับ admin

    if (!isStudentId && !isNationalId && !isUsername) {
      return "รหัสนิสิตต้องเป็นตัวเลข 8-10 หลัก, เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก หรือ Username สำหรับ Admin";
    }

    return null;
  };

  // Submit function
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.showError("ข้อมูลไม่ถูกต้อง", validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // ตรวจสอบประเภทของ identifier
      const isStudentId = /^\d{8,10}$/.test(identifier);
      const isNationalId = /^\d{13}$/.test(identifier);
      const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(identifier);

      // เข้ารหัส identifier สำหรับการค้นหา (เฉพาะเลขบัตรประชาชน)
      const hashedIdentifier = isNationalId ? await bcrypt.hash(identifier, 12) : identifier;

      let loginType = 'student_id';
      if (isNationalId) loginType = 'national_id';
      if (isUsername) loginType = 'username';

      const loginData = {
        identifier: hashedIdentifier,
        password,
        type: loginType,
        originalIdentifier: identifier // ส่ง plain text ไปด้วยเพื่อเปรียบเทียบ
      };

      const result = await login(loginData);

      if (result.success) {
        toast.showSuccess("เข้าสู่ระบบสำเร็จ", "ยินดีต้อนรับเข้าสู่ระบบ");
        setIsRedirecting(true);
        setTimeout(() => {
          router.push("/"); // หรือ redirect ไปหน้าอื่น
        }, 1500);

      } else {
        toast.showError("เข้าสู่ระบบไม่สำเร็จ", result.error ?? "รหัสนิสิต/บัตรประชาชน หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  // แสดง Loading component เมื่อกำลัง redirect
  if (isRedirecting) {
    return (
      <Loading
        text="กำลังเข้าสู่ระบบ..."
        color="emerald"
        size="md"
        fullScreen={true}
      />
    );
  }

  return (
    <div className="tw-mx-4 tw-my-4">
      <h2 className="tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-gray-800 tw-mb-4 sm:tw-mb-6 lg:tw-mb-4 tw-mt-[60px]">
        เข้าสู่ระบบ
      </h2>

      <div className="tw-space-y-4 sm:tw-space-y-5 lg:tw-space-y-6">
        <div>
          <InputField
            type="text"
            placeholder="รหัสนิสิต / เลขบัตรประชาชน / Username (Admin)"
            value={identifier}
            maxLength={20}
            onChange={(val) => setIdentifier(val as string)}
            required
          />
          <p className="tw-text-xs tw-text-gray-500 tw-mt-2">
            • นิสิต: รหัสนิสิต 8-10 หลัก<br />
            • บุคลากร: เลขบัตรประชาชน 13 หลัก<br />
            • Admin: Username
          </p>
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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
          >
            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
              {isSubmitting ? (
                <>
                  <div className="tw-animate-spin tw-rounded-full tw-h-4 tw-w-4 tw-border-b-2 tw-border-white"></div>
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
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
                </>
              )}
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
