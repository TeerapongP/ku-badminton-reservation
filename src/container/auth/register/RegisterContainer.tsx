"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import { DropdownField } from "@/components/DropdownField";
import { DateField } from "@/components/DateField";
import AutoCompleteField from "@/components/AutoCompleteField";
import { DropdownOption } from "@/type/DropdownOption";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
    userTypeOptions,
    prefixTitleOptions,
    levelStudyOptions,
    staffTypeOptions,
} from '@/constants/options';
import bcrypt from 'bcryptjs';

export default function RegisterContainner() {
    const toast = useToast();
    const { register } = useAuth();
    const router = useRouter();

    // Loading state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Password fields
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [studentId, setStudentId] = useState('');
    const [nationnalId, setNationnalId] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickName] = useState('');
    const [userType, setUserType] = useState<"student" | "staff" | "guest">("student");
    const [prefix, setPrefix] = useState<{ en: string; th: string } | null>(null);
    const [dob, setDob] = useState<Date | null>(null);
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [houseNumber, setHouseNumber] = useState<string>('');
    const [street, setStreet] = useState<string>('');
    const [tambon, setTambon] = useState<string>('');
    const [district, setDistrict] = useState<string>('');
    const [province, setProvince] = useState<string>('');
    const [postalCode, setPostalCode] = useState<string>('');
    const [faculty, setFaculty] = useState<string>('');
    const [department, setDepartment] = useState<string>('');
    const [levelStudy, setLevelStudy] = useState<string>('');
    const [office, setOffice] = useState<string>('');
    const [jobtitle, setJobtitle] = useState<string>('');
    const [staffType, setStaffType] = useState<string>('');

    const [officeOptions, setOfficeOptions] = useState<DropdownOption[]>([]);
    const [subUnitOption, setSubUnitOptions] = useState<DropdownOption[]>([]);
    const today = new Date();
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());

    const [districtOptions, setDistrictOptions] = useState<DropdownOption[]>([]);
    const [provincesOptions, setProvinceOptions] = useState<DropdownOption[]>([]);
    const [postCodeOptions, setPostCodeOptions] = useState<DropdownOption[]>([]);
    const [facultiesOption, setFacultiesOptions] = useState<DropdownOption[]>([]);
    const [departmentOption, setDepartmentOptions] = useState<DropdownOption[]>([]);


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

    async function fetchTambons(tambon: string): Promise<DropdownOption[]> {
        try {
            const res = await fetch(`/api/tambons?tambon=${encodeURIComponent(tambon)}&take=10`, {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []).map((x: any) => ({
                label: x.label ?? x.name_th,
                value: x.value ?? String(x.id),
            }));
        } catch (error) {
            toast.showError('ไม่สามารถค้นหาตำบลได้', 'กรุณาลองใหม่อีกครั้ง');
            throw error;
        }
    }

    async function fetchDistricts(tambonId: string): Promise<DropdownOption[]> {
        try {
            const res = await fetch(`/api/districts?tambonId=${encodeURIComponent(tambonId)}`, {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []).map((x: any) => ({
                label: x.label ?? x.name_th,
                value: x.value ?? String(x.id),
            }));
        } catch (error) {
            toast.showError('ไม่สามารถโหลดข้อมูลอำเภอได้', 'กรุณาลองใหม่อีกครั้ง');
            throw error;
        }
    }

    async function fetchProvinces(districtsId: string): Promise<DropdownOption[]> {
        try {
            const res = await fetch(`/api/provinces?districtId=${encodeURIComponent(districtsId)}`, {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return (json?.data ?? []).map((x: any) => ({
                label: x.label ?? x.name_th,
                value: x.value ?? String(x.id),
            }));
        } catch (error) {
            toast.showError('ไม่สามารถโหลดข้อมูลจังหวัดได้', 'กรุณาลองใหม่อีกครั้ง');
            throw error;
        }
    }

    async function fetchPostcode(tambonId: string): Promise<DropdownOption[]> {
        const res = await fetch(`/api/postcodes?tambonId=${encodeURIComponent(tambonId)}`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.label ?? x.name_th, // ใช้ label (รหัสไปรษณีย์) เป็น value ด้วย
        }));
    }

    async function fetchFaculties(): Promise<DropdownOption[]> {
        const res = await fetch(`/api/faculties`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
    }

    async function fetchDepartments(facultyId: string): Promise<DropdownOption[]> {
        if (!facultyId) return [];

        try {
            const res = await fetch(`/api/departments?facultyId=${encodeURIComponent(facultyId)}`, {
                cache: 'no-store',
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();

            const data = (json?.data ?? []).map((x: any) => ({
                label: x.label ?? x.name_th ?? "",
                value: x.value ?? String(x.id ?? ""),
            }));

            return data.filter((x: { label: any; value: any; }) => x.label && x.value);
        } catch (err) {
            console.error("fetchDepartments error:", err);
            return [];
        }
    }

    // state/ref ที่ใช้
    const loadedInitRef = useRef(false);
    const reqIdRef = useRef(0);

    // 1) โหลด Units + Faculties แค่ครั้งแรก
    useEffect(() => {
        if (loadedInitRef.current) return;

        const controller = new AbortController();
        let alive = true;

        (async () => {
            try {
                const [units, faculties] = await Promise.all([
                    fetchUnits(),
                    fetchFaculties(),
                ]);
                if (!alive) return;

                setOfficeOptions(units ?? []);
                setFacultiesOptions(faculties ?? []);
            } catch {
                if (alive) {
                    setOfficeOptions([]);
                    setFacultiesOptions([]);
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

    // 2) faculty -> departments
    useEffect(() => {
        const controller = new AbortController();
        let alive = true;
        const rid = ++reqIdRef.current;

        (async () => {
            // reset ก่อน
            setDepartmentOptions([]);
            setDepartment('');

            if (!faculty) return;

            try {
                const deps = await fetchDepartments(faculty);
                if (!alive || rid !== reqIdRef.current) return;
                setDepartmentOptions(deps ?? []);
                // ถ้าเหลือตัวเดียว auto-select
                if (deps?.length === 1) setDepartment(deps[0].value);
            } catch {
                if (alive && rid === reqIdRef.current) {
                    setDepartmentOptions([]);
                    setDepartment('');
                }
            }
        })();

        return () => {
            alive = false;
            controller.abort();
        };
    }, [faculty]);

    // 3) office -> subUnits
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

    const searchTambon = useCallback(async (q: string): Promise<string[]> => {
        try {
            const tambons = await fetchTambons(q);
            const tambonId = tambons.find(t => t.value)?.value ?? null;
            await searchDistricts(tambonId);
            return tambons.map(t => t.label ?? '').filter(label => label !== '');
        } catch (error) {
            return [];
        }
    }, []);

    const searchProvinces = useCallback(
        async (districtId: string | undefined): Promise<void> => {
            if (!districtId) {
                setProvinceOptions([]);
                setProvince('');
                return;
            }
            try {
                const provinces = await fetchProvinces(districtId);
                setProvinceOptions(provinces);

                if (provinces.length === 1) {
                    setProvince(provinces[0].value);
                }
            } catch {
                setProvinceOptions([]);
                setProvince('');
            }
        },
        []
    );

    const searchDistricts = useCallback(
        async (tambonId: string): Promise<void> => {
            if (!tambonId) {
                setDistrictOptions([]);
                setDistrict('');
                setProvinceOptions([]);
                setProvince('');
                return;
            }
            try {
                const districts = await fetchDistricts(tambonId);
                const postCodes = await fetchPostcode(tambonId);
                setPostCodeOptions(postCodes);
                setDistrictOptions(districts);

                if (districts.length === 1) {
                    const only = districts[0].value;
                    setDistrict(only);
                    await searchProvinces(only);
                }
                if (postCodes && postCodes.length === 1) {
                    setPostalCode(postCodes[0].value || '');
                } else {
                    setPostalCode('');
                }
            } catch {
                setDistrictOptions([]);
                setDistrict('');
                setProvinceOptions([]);
                setProvince('');
            }
        },
        [searchProvinces]
    );

    // Validation function
    const validateForm = (): string | null => {
        // Basic validation
        if (!username.trim()) return "กรุณากรอกชื่อผู้ใช้";
        if (!password) return "กรุณากรอกรหัสผ่าน";
        if (password !== confirmPassword) return "รหัสผ่านไม่ตรงกัน";
        if (password.length < 6) return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
        if (!nationnalId.trim()) return "กรุณากรอกรหัสบัตรประชาชน";
        if (!firstName.trim()) return "กรุณากรอกชื่อ";
        if (!lastName.trim()) return "กรุณากรอกนามสกุล";
        if (!email.trim()) return "กรุณากรอกอีเมล";
        if (!phone.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
        if (phone && !/^0\d{9}$/.test(phone)) return "เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก";
        if (postalCode && !/^\d{5}$/.test(postalCode)) return "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก";
        if (nationnalId && !/^\d{13}$/.test(nationnalId)) return "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";

        // Student validation
        if (userType === "student") {
            if (!studentId.trim()) return "กรุณากรอกรหัสนิสิต";
            if (!faculty) return "กรุณาเลือกคณะ";
            if (!department) return "กรุณาเลือกสาขา";
            if (!levelStudy) return "กรุณาเลือกระดับการศึกษา";
        }

        // Staff validation
        if (userType === "staff") {
            if (!office) return "กรุณาเลือกหน่วยงาน";
            if (!staffType) return "กรุณาเลือกประเภทบุคลากร";
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
            // เข้ารหัส password และ national_id
            const hashedPassword = await bcrypt.hash(password, 12);
            const hashedNationalId = nationnalId ? await bcrypt.hash(nationnalId, 12) : null;

            const userData = {
                // Basic info
                username: username.trim(),
                password: hashedPassword,
                email: email.trim(),
                phone: phone.trim(),
                title_th: prefix?.th || null,
                 title_en: prefix?.en || null,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                nickname: nickname.trim(),
                dob: dob ? new Date(dob.getTime() + (7 * 60 * 60 * 1000)).toISOString() : null,
                role: userType,

                // Student specific
                ...(userType === "student" && {
                    student_id: studentId.trim(),
                    faculty_id: faculty,
                    department_id: department,
                    level_of_study: levelStudy,
                }),

                // Staff specific
                ...(userType === "staff" && {
                    national_id: hashedNationalId,
                    staff_type: staffType,
                    unit_id: office,
                    position: jobtitle,
                }),

                // Guest specific
                ...(userType === "guest" && {
                    national_id: hashedNationalId,
                }),

                // Address
                house_number: houseNumber.trim() || null,
                street: street.trim() || null,
                subdistrict: tambon.trim() || null,
                district: district ? districtOptions.find(d => d.value === district)?.label : null,
                province: province ? provincesOptions.find(p => p.value === province)?.label : null,
                postal_code: postalCode && /^\d{5}$/.test(postalCode) ? postalCode : null,
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
                toast.showError("สมัครสมาชิกไม่สำเร็จ", result.error || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("Registration error:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <div className="tw-mx-4 tw-my-4">
                <h2 className="tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-gray-800 tw-mb-4 sm:tw-mb-6 lg:tw-mb-4 tw-mt-[60px]">
                    สมัครสมาชิก
                </h2>
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

                {userType === "student" && (
                    <div className="tw-col-span-4 md:tw-col-span-12 sm:tw-col-span-12">
                        <InputField
                            type="text"
                            placeholder="กรอกเลขบัตรนิสิต"
                            value={studentId}
                            maxLength={10}
                            onChange={(val) => setStudentId(val as string)}
                            required
                        />
                    </div>
                )}
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

                <div className="tw-col-span-4 md:tw-col-span-12">
                    <InputField
                        type="text"
                        placeholder="ชื่อผู้ใช้ (Username)"
                        value={username}
                        onChange={(val) => setUsername(val as string)}
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
                        type="text"
                        placeholder="ชื่อเล่น"
                        value={nickname}
                        onChange={(val) => setNickName(val as string)}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <DateField
                        value={dob}
                        onChange={setDob}
                        showIcon={true}
                        maxDate={today}
                        minDate={hundredYearsAgo}
                        placeholder="เลือกวันเกิด"
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
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <InputField
                        type="text"
                        placeholder="บ้านเลขที่"
                        value={houseNumber}
                        onChange={(val) => setHouseNumber(val as string)}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <InputField
                        type="text"
                        placeholder="ถนน"
                        value={street}
                        onChange={(val) => setStreet(val as string)}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <AutoCompleteField
                        placeholder="พิมพ์ชื่อตำบล"
                        value={tambon}
                        onChange={(value) => setTambon(value || "")}
                        onSearch={searchTambon}
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <DropdownField
                        placeholder="กรุณาเลือกเขตหรืออำเภอ"
                        value={district}
                        disabled={true}
                        onChange={setDistrict}
                        options={districtOptions}
                        optionLabel="label"
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <DropdownField
                        placeholder="กรุณาเลือกจังหวัด"
                        value={province}
                        onChange={setProvince}
                        disabled={true}
                        options={provincesOptions}
                        optionLabel="label"
                        required
                    />
                </div>
                <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                    <DropdownField
                        placeholder="กรุณาเลือกรหัสไปรษณ์ย์"
                        value={postalCode}
                        disabled={true}
                        onChange={setPostalCode}
                        options={postCodeOptions}
                        optionLabel="label"
                        required
                    />
                </div>
                {userType === "student" && (
                    <>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-12">
                            <DropdownField
                                placeholder="คณะ"
                                value={faculty}
                                onChange={setFaculty}
                                options={facultiesOption}
                                optionLabel="label"
                                required
                            />
                        </div>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                            <DropdownField
                                placeholder="สาขา"
                                value={department}
                                onChange={setDepartment}
                                options={departmentOption}
                                optionLabel="label"
                                required
                                disabled={!faculty}
                            />
                        </div>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                            <DropdownField
                                placeholder="ระดับการศึกษา"
                                value={levelStudy}
                                onChange={setLevelStudy}
                                options={levelStudyOptions}
                                optionLabel="label"
                                required
                            />
                        </div>
                    </>
                )}
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
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                            <DropdownField
                                placeholder="ตำแหน่งงาน"
                                value={jobtitle}
                                onChange={setJobtitle}
                                options={subUnitOption}
                                optionLabel="label"
                                required
                            />
                        </div>
                        <div className="tw-col-span-4 md:tw-col-span-4 lg:tw-col-span-6">
                            <DropdownField
                                placeholder="ประเภทบุคลากร"
                                value={staffType}
                                onChange={setStaffType}
                                options={staffTypeOptions}
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




