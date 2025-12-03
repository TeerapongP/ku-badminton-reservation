"use client"

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import { DropdownField } from "@/components/DropdownField";

import { DropdownOption } from "@/types/DropdownOption";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
    prefixTitleOptions,
} from '@/constants/options';
import { hashPassword, encryptDataClient } from '@/lib/encryption';

export default function RegisterContainner() {
    const toast = useToast();
    const { register } = useAuth();
    const router = useRouter();

    // User type options (staff, guest, student, admin, super_admin)
    const userTypeOptions = [
        { label: "บุคลากร", value: "staff" },
        { label: "นักเรียนสาธิต", value: "student" },
        { label: "บุคคลทั่วไป", value: "guest" },
    ];

    // Loading state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Password fields
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nationnalId, setNationnalId] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [userType, setUserType] = useState<"staff" | "student" | "guest" | "demonstration_student">("staff");
    const [prefix, setPrefix] = useState<{ en: string; th: string } | null>(null);
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [office, setOffice] = useState<string>('');
    const [jobtitle, setJobtitle] = useState<string>('');

    const [officeOptions, setOfficeOptions] = useState<DropdownOption[]>([]);
    const [subUnitOption, setSubUnitOptions] = useState<DropdownOption[]>([]);


    async function fetchUnits(): Promise<DropdownOption[]> {
        try {
            const res = await fetch(`/api/units`, {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []).map((x: any) => ({
                label: x.label ?? x.name_th,
                value: x.value ?? String(x.id),
            }));
        } catch (error) {
            toast.showError('ไม่สามารถโหลดข้อมูลหน่วยงานได้', 'กรุณาลองใหม่อีกครั้ง');
            throw error;
        }
    }

    async function fetchSubUnits(
        unitId: string,
    ): Promise<DropdownOption[]> {
        const res = await fetch(
            `/api/sub-units?unitId=${encodeURIComponent(unitId)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
    }

    // state/ref ที่ใช้
    const loadedInitRef = useRef(false);
    const reqIdRef = useRef(0);

    // 1) โหลด Units แค่ครั้งแรก
    useEffect(() => {
        if (loadedInitRef.current) return;

        const controller = new AbortController();
        let alive = true;

        (async () => {
            try {
                const units = await fetchUnits();
                if (!alive) return;

                setOfficeOptions(units ?? []);
            } catch {
                if (alive) {
                    setOfficeOptions([]);
                }
            } finally {
                loadedInitRef.current = true;
            }
        })();

        return () => {
            alive = false;
            controller.abort();
        };
    }, []);



    // 2) office -> subUnits
    useEffect(() => {
        const controller = new AbortController();
        let alive = true;
        const rid = ++reqIdRef.current;

        (async () => {
            setSubUnitOptions([]);

            if (!office) return;

            try {
                const subs = await fetchSubUnits(office);
                if (!alive || rid !== reqIdRef.current) return;
                setSubUnitOptions(subs ?? []);
            } catch {
                if (alive && rid === reqIdRef.current) setSubUnitOptions([]);
            }
        })();

        return () => {
            alive = false;
            controller.abort();
        };
    }, [office]);



    // Validation function
    const validateForm = (): string | null => {
        // Basic validation
        if (!password) return "กรุณากรอกรหัสผ่าน";
        if (password !== confirmPassword) return "รหัสผ่านไม่ตรงกัน";
        if (password.length < 6) return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
        if (!firstName.trim()) return "กรุณากรอกชื่อ";
        if (!lastName.trim()) return "กรุณากรอกนามสกุล";
        if (!email.trim()) return "กรุณากรอกอีเมล";
        if (!phone.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
        if (phone && !/^0\d{9}$/.test(phone)) return "เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก";

        // ผู้ใช้อื่นใช้ national_id
        if (!nationnalId.trim()) return "กรุณากรอกรหัสบัตรประชาชน";
        if (nationnalId && !/^\d{13}$/.test(nationnalId)) return "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";

        // Staff validation
        if (userType === "staff") {
            if (!office) return "กรุณาเลือกหน่วยงาน";
        }

        return null;
    };

    // Submit function
    const handleSubmit = async () => {
        // Validate form
        const validationError = validateForm();
        if (validationError) {
            toast.showError("ข้อมูลไม่ครบถ้วน", validationError);
            return;
        }

        setIsSubmitting(true);

        try {
            const encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
            if (!encryptionKey) {
                throw new Error("Encryption key not found");
            }

            // เข้ารหัส password, national_id และ role
            const hashedPassword = await hashPassword(password);
            const encryptedNationalId = nationnalId ? encryptDataClient(nationnalId, encryptionKey) : null;
            const encryptedRole = encryptDataClient(userType, encryptionKey);

            const userData = {
                // Basic info
                username: `USER_${Date.now()}`,
                password: hashedPassword,
                email: email.trim(),
                phone: phone.trim(),
                title_th: prefix?.th ?? null,
                title_en: prefix?.en ?? null,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role: encryptedRole,
                national_id: encryptedNationalId,

                // Staff specific
                ...(userType === "staff" && {
                    unit_id: office,
                    position: jobtitle,
                    staff_type: "university", // default value
                }),

                // Student specific (นักเรียนสาธิต)
                ...(userType === "demonstration_student" && {
                    student_id: `STU_${Date.now()}`, // generate student_id
                    faculty_id: 1, // default faculty
                    department_id: 1, // default department
                    level_of_study: "UG", // default level
                }),
            };

            const result = await register(userData);

            if (result.success) {
                toast.showSuccess(
                    "สมัครสมาชิกสำเร็จ",
                    "กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านที่สร้างไว้"
                );

                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                const errorMessage = typeof result.error === 'object' && result.error?.message
                    ? result.error.message
                    : result.error ?? "เกิดข้อผิดพลาด";
                toast.showError("สมัครสมาชิกไม่สำเร็จ", errorMessage);
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <div className="tw-mx-4 tw-my-4">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-4 sm:tw-mb-6 lg:tw-mb-4 tw-mt-[60px]">
                    <h2 className="tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-gray-800">
                        สมัครสมาชิก
                    </h2>
                    <Link
                        href="/"
                        className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-white tw-border tw-border-gray-300 tw-rounded-lg hover:tw-bg-gray-50 tw-transition-colors tw-duration-200 tw-flex tw-items-center tw-gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="tw-w-4 tw-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>


            <div className="tw-grid tw-grid-cols-4 md:tw-grid-cols-12 tw-gap-4 tw-px-4 tw-py-4">
                <div className="tw-col-span-4 sm:tw-col-span-12">
                    <DropdownField
                        placeholder="กรุณาเลือกประเภทสมาชิก"
                        value={userType}
                        onChange={setUserType}
                        options={userTypeOptions}
                        optionLabel="label"
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-12">
                    <InputField
                        type="text"
                        placeholder="กรอกรหัสบัตรประชาชน"
                        value={nationnalId}
                        maxLength={13}
                        onChange={(val) => setNationnalId(val as string)}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-6">
                    <InputField
                        type="password"
                        placeholder="รหัสผ่าน"
                        value={password}
                        onChange={(val) => setPassword(val as string)}
                        required
                    />
                </div>

                <div className="tw-col-span-4 md:tw-col-span-6">
                    <InputField
                        type="password"
                        placeholder="ยืนยันรหัสผ่าน"
                        value={confirmPassword}
                        onChange={(val) => setConfirmPassword(val as string)}
                        required
                    />
                </div>

                <div className="tw-col-span-4 md:tw-col-span-3">
                    <DropdownField
                        placeholder="คำนำหน้า"
                        value={prefix}
                        onChange={setPrefix}
                        options={prefixTitleOptions}
                        optionLabel="label"
                        required
                    />
                </div>

                <div className="tw-col-span-4 md:tw-col-span-5">
                    <InputField
                        type="text"
                        placeholder="ชื่อ"
                        value={firstName}
                        onChange={(val) => setFirstName(val as string)}
                        required
                    />
                </div>

                <div className="tw-col-span-4 md:tw-col-span-4">
                    <InputField
                        type="text"
                        placeholder="นามสกุล"
                        value={lastName}
                        onChange={(val) => setLastName(val as string)}
                        required
                    />
                </div>


                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <InputField
                        type="tel"
                        placeholder="กรอกเบอร์โทรศัพท์"
                        value={phone}
                        maxLength={10}
                        onChange={(val) => setPhone(val as string)}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <InputField
                        type="email"
                        placeholder="กรอกอีเมล"
                        value={email}
                        onChange={(val) => setEmail(val as string)}
                        required
                    />
                </div>


                {userType === "staff" && (
                    <>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-12">
                            <DropdownField
                                placeholder="หน่วยงาน/สังกัด"
                                value={office}
                                onChange={setOffice}
                                options={officeOptions}
                                optionLabel="label"
                                required
                            />
                        </div>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-12">
                            <DropdownField
                                placeholder="ตำแหน่งงาน"
                                value={jobtitle}
                                onChange={setJobtitle}
                                options={subUnitOption}
                                optionLabel="label"
                                required
                            />
                        </div>
                    </>
                )}

            </div>
            <div className="tw-flex tw-justify-center tw-mt-4 tw-mx-4">
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
                                กำลังสมัครสมาชิก...
                            </>
                        ) : (
                            "สมัครสมาชิก"
                        )}
                    </span>
                </Button>
            </div>

            <div className="tw-flex tw-justify-center tw-items-center tw-text-sm tw-font-medium tw-text-gray-700 tw-my-4 ">
                <span className="tw-mr-2">มีบัญชีผู้ใช้แล้ว?</span>
                <Link
                    href="/login"
                    className="tw-text-emerald-600 hover:tw-text-emerald-700 tw-underline tw-underline-offset-2"
                >
                    เข้าสู่ระบบ
                </Link>
            </div>
        </>
    );
}




