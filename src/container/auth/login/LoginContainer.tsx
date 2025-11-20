"use client";

import { useState } from "react";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
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
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

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

    // ตรวจสอบ CAPTCHA ถ้าจำเป็น
    if (requireCaptcha && !captchaToken) {
      toast.showError("กรุณายืนยัน CAPTCHA", "กรุณาทำ CAPTCHA ก่อนเข้าสู่ระบบ");
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

      // กำหนด loginType ตามลำดับความสำคัญ
      let loginType = 'username'; // default
      if (isStudentId) loginType = 'student_id';
      else if (isNationalId) loginType = 'national_id';

      const loginData = {
        identifier: hashedIdentifier,
        password,
        type: loginType,
        originalIdentifier: identifier // ส่ง plain text ไปด้วยเพื่อเปรียบเทียบ
      };

      console.log("🔐 Attempting login with data:", {
        identifier: hashedIdentifier,
        type: loginType,
        hasPassword: !!password,
        originalIdentifier: identifier
      });

      const result = await login(loginData);

      if (result.success) {
        // ตรวจสอบว่าเป็นนิสิตที่ login ครั้งแรกหรือไม่
        const isStudent = result.user?.role === 'student';
        const isFirstLogin = result.user?.isFirstLogin === true;

        console.log("🔍 Login result:", {
          role: result.user?.role,
          isStudent,
          isFirstLogin,
          fullUser: result.user
        });

        if (isStudent && isFirstLogin) {
          toast.showSuccess("เข้าสู่ระบบสำเร็จ", "กรุณาเปลี่ยนรหัสผ่านของคุณ");
          setIsRedirecting(true);
          setTimeout(() => {
            router.push("/forgot-password");
          }, 1500);
        } else {
          console.log("✅ Redirecting to home");
          toast.showSuccess("เข้าสู่ระบบสำเร็จ", "ยินดีต้อนรับเข้าสู่ระบบ");
          setIsRedirecting(true);
          setTimeout(() => {
            router.push("/");
          }, 1500);
        }

      } else {
        // เพิ่มจำนวนครั้งที่ล้มเหลว
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        // ตรวจสอบว่าต้องแสดง RECAPTCHA หรือไม่ (หลัง 5 ครั้ง)
        if (newFailedAttempts >= 5) {
          setRequireCaptcha(true);
          toast.showError(
            "เข้าสู่ระบบไม่สำเร็จ", 
            "คุณพยายามเข้าสู่ระบบผิดหลายครั้ง กรุณายืนยัน CAPTCHA"
          );
        } else {
          const remainingAttempts = 3 - newFailedAttempts;
          toast.showError(
            "เข้าสู่ระบบไม่สำเร็จ", 
            `${result.error ?? "รหัสนิสิต/บัตรประชาชน หรือรหัสผ่านไม่ถูกต้อง"} (เหลือ ${remainingAttempts} ครั้ง)`
          );
        }
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
            placeholder="รหัสนิสิต / เลขบัตรประชาชน "
            value={identifier}
            maxLength={20}
            onChange={(val) => setIdentifier(val as string)}
            required
          />
          <p className="tw-text-xs tw-text-gray-500 tw-mt-2">
            • นิสิต: รหัสนิสิต 8-10 หลัก<br />
            • บุคลากร: เลขบัตรประชาชน 13 หลัก<br />
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

        {/* RECAPTCHA Warning */}
        {requireCaptcha && (
          <div className="tw-bg-yellow-50 tw-border-l-4 tw-border-yellow-400 tw-p-4 tw-rounded-md">
            <div className="tw-flex">
              <div className="tw-flex-shrink-0">
                <svg className="tw-h-5 tw-w-5 tw-text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="tw-ml-3">
                <p className="tw-text-sm tw-text-yellow-700">
                  <strong>คำเตือน:</strong> คุณพยายามเข้าสู่ระบบผิดหลายครั้ง ({failedAttempts} ครั้ง)
                </p>
                <p className="tw-text-xs tw-text-yellow-600 tw-mt-1">
                  กรุณายืนยันว่าคุณไม่ใช่บอท (CAPTCHA verification required)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Google reCAPTCHA */}
        {requireCaptcha && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <div className="tw-flex tw-justify-center" data-testid="recaptcha">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
              onErrored={() => {
                setCaptchaToken(null);
                toast.showError("CAPTCHA Error", "เกิดข้อผิดพลาดกับ CAPTCHA กรุณาลองใหม่");
              }}
            />
          </div>
        )}

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
