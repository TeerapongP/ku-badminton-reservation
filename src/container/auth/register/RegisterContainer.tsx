"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";
import { DropdownField } from "@/component/DropdownField";
import { DateField } from "@/component/DateField";
import AutoCompleteField from "@/component/AutoCompleteField";
import { DropdownOption } from "@/type/DropdownOption";
import {
    userTypeOptions,
    prefixTitleOptions,
    levelStudyOptions,
    staffTypeOptions,
} from '@/constants/options';

export default function RegisterContainner() {
    const [studentId, setStudentId] = useState('');
    const [nationnalId, setNationnalId] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickName] = useState('');
    const [userType, setUserType] = useState<"student" | "staff" | "guest">("student");
    const [prefix, setPrefix] = useState<string>("");
    const [dob, setDob] = useState<Date | null>(null);
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string | null>();
    const [houseNumber, setHouseNumber] = useState<string | null>();
    const [street, setStreet] = useState<string | null>();
    const [tambon, setTambon] = useState<string>("");
    const [district, setDistrict] = useState<string>();
    const [province, setProvince] = useState<string>();
    const [postalCode, setPostalCode] = useState<string>();
    const [faculty, setFaculty] = useState<string | null>();
    const [department, setDepartment] = useState<string | null>();
    const [levelStudy, setLevelStudy] = useState<string | null>();
    const [office, setOffice] = useState<string | null>(null);
    const [jobtitle, setJobtitle] = useState<string | null>(null);
    const [staffType, setStaffType] = useState<string | null>(null);

    const [officeOptions, setOfficeOptions] = useState<DropdownOption[]>([]);
    const [subUnitOption, setSubUnitOptions] = useState<DropdownOption[]>([]);
    const today = new Date();
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const loadedUnitsRef = useRef(false);

    const [districtOptions, setDistrictOptions] = useState<DropdownOption[]>([]);
    const [provincesOptions, setProvinceOptions] = useState<DropdownOption[]>([]);
    const [postCodeOptions, setPostCodeOptions] = useState<DropdownOption[]>([]);
    const [facultiesOption, setFacultiesOptions] = useState<DropdownOption[]>([]);
    const [departmentOption, setDepartmentOptions] = useState<DropdownOption[]>([]);


    async function fetchUnits(): Promise<DropdownOption[]> {
        const res = await fetch(`/api/units`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
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
        const res = await fetch(`/api/tambons?tambon=${encodeURIComponent(tambon)}&take=10`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
    }

    async function fetchDistricts(tambonId: string): Promise<DropdownOption[]> {
        const res = await fetch(`/api/districts?tambonId=${encodeURIComponent(tambonId)}`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
    }

    async function fetchProvinces(districtsId: string): Promise<DropdownOption[]> {
        const res = await fetch(`/api/provinces?districtId=${encodeURIComponent(districtsId)}`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
        }));
    }

    async function fetchPostcode(tambonId: string): Promise<DropdownOption[]> {
        const res = await fetch(`/api/postcodes?tambonId=${encodeURIComponent(tambonId)}`, {
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return (json?.data ?? []).map((x: any) => ({
            label: x.label ?? x.name_th,
            value: x.value ?? String(x.id),
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
            setDepartment("");

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
                    setDepartment("");
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
                setProvince("");
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
                setProvince("");
            }
        },
        []
    );

    const searchDistricts = useCallback(
        async (tambonId: string): Promise<void> => {
            if (!tambonId) {
                setDistrictOptions([]);
                setDistrict("");
                setProvinceOptions([]);
                setProvince("");
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
                    setPostalCode(postCodes[0].value);
                } else {
                    setPostalCode("");
                }
            } catch {
                setDistrictOptions([]);
                setDistrict("");
                setProvinceOptions([]);
                setProvince("");
            }
        },
        [searchProvinces]
    );


    return (
        <>
            <div className="mx-4 my-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-4 mt-[60px]">
                    สมัครสมาชิก
                </h2>
            </div>
            <div className="mx-4">
                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
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
                    <div className="mt-4">
                        <InputField
                            type="text"
                            placeholder="กรอกรหัสนิสิต"
                            value={studentId}
                            maxLength={10}
                            onChange={(val) => setStudentId(val as string)}
                            required
                        />
                    </div>
                )}

                <div className="mt-4">
                    <InputField
                        type="text"
                        placeholder="กรอกรหัสบัตรประชาชน"
                        value={nationnalId}
                        maxLength={13}
                        onChange={(val) => setNationnalId(val as string)}
                        required
                    />
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/3">
                        <DropdownField
                            placeholder="คำนำหน้า"
                            value={prefix}
                            onChange={setPrefix}
                            options={prefixTitleOptions}
                            optionLabel="label"
                            required
                        />
                    </div>
                    <div className="w-full sm:w-1/3">
                        <InputField
                            type="text"
                            placeholder="ชื่อ"
                            value={firstName}
                            onChange={(val) => setFirstName(val as string)}
                            required
                        />
                    </div>

                    <div className="w-full sm:w-1/3">
                        <InputField
                            type="text"
                            placeholder="นามสกุล"
                            value={lastName}
                            onChange={(val) => setLastName(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2">
                        <InputField
                            type="text"
                            placeholder="ชื่อเล่น"
                            value={nickname}
                            onChange={(val) => setNickName(val as string)}
                            required
                        />
                    </div>

                    <div className="w-full sm:w-1/2">
                        <DateField
                            value={dob}
                            onChange={setDob}
                            showIcon={false}
                            maxDate={today}
                            minDate={hundredYearsAgo}
                            placeholder="เลือกวันเกิด"
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2">
                        <InputField
                            type="tel"
                            placeholder="กรอกเบอร์โทรศัพท์"
                            value={phone}
                            maxLength={10}
                            onChange={(val) => setPhone(val as string)}
                            required
                        />

                    </div>

                    <div className="w-full sm:w-1/2">
                        <InputField
                            type="email"
                            placeholder="กรอกอีเมล"
                            value={email}
                            onChange={(val) => setEmail(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2">
                        <InputField
                            type="text"
                            placeholder="บ้านเลขที่"
                            value={houseNumber}
                            onChange={(val) => setHouseNumber(val as string)}
                            required
                        />
                    </div>
                    <div className="w-full sm:w-1/2">
                        <InputField
                            type="text"
                            placeholder="ถนน"
                            value={street}
                            onChange={(val) => setStreet(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2">
                        <AutoCompleteField
                            placeholder="พิมพ์ชื่อตำบล"
                            value={tambon}
                            onChange={(value) => setTambon(value ?? "")}
                            onSearch={searchTambon}
                            required
                        />
                    </div>
                    <div className="w-full sm:w-1/2">
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
                </div>
                <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/2">
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
                    <div className="w-full sm:w-1/2">
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
                </div>

                {userType === "student" && (
                    <>
                        <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                            <div className="w-full">
                                <DropdownField
                                    placeholder="คณะ"
                                    value={faculty}
                                    onChange={setFaculty}
                                    options={facultiesOption}
                                    optionLabel="label"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                            <div className="w-full">
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
                        </div>

                        <div className="mt-4 mb-4 flex flex-col sm:flex-row gap-4">
                            <div className="w-full">
                                <DropdownField
                                    placeholder="ระดับการศึกษา"
                                    value={levelStudy}
                                    onChange={setLevelStudy}
                                    options={levelStudyOptions}
                                    optionLabel="label"
                                    required
                                />
                            </div>
                        </div>
                    </>
                )}

                {userType === "staff" && (
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        {/* หน่วยงาน/สังกัด */}
                        <div className="w-full sm:w-1/3">
                            <DropdownField
                                placeholder="หน่วยงาน/สังกัด"
                                value={office}
                                onChange={setOffice}
                                options={officeOptions}
                                optionLabel="label"
                                required
                            />
                        </div>

                        {/* ตำแหน่งงาน */}
                        <div className="w-full sm:w-1/3">
                            <DropdownField
                                placeholder="ตำแหน่งงาน"
                                value={jobtitle}
                                onChange={setJobtitle}
                                options={subUnitOption}
                                optionLabel="label"
                                required
                            />
                        </div>

                        {/* ประเภทบุคลากร */}
                        <div className="w-full sm:w-1/3">
                            <DropdownField
                                placeholder="ประเภทบุคลากร"
                                value={staffType}
                                onChange={setStaffType}
                                options={staffTypeOptions}
                                optionLabel="label"
                                required
                            />
                        </div>
                    </div>
                )}
                <div className="flex justify-center mt-4">
                    <Button
                        className="w-full sm:w-1/2 h-12 text-lg font-semibold shadow-md"
                        colorClass="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                    >
                        สมัครสมาชิก
                    </Button>
                </div>

                <div className="relative mt-4 mb-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-sm text-gray-400"></span>
                    </div>
                </div>


                <div className="mb-4 flex justify-center items-center text-sm font-medium text-gray-700">
                    <span className="mr-2">มีบัญชีผู้ใช้?</span>
                    <Link
                        href="/login"
                        className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                    >
                        เข้าสู่ระบบ
                    </Link>
                </div>


            </div>
        </>
    );
}




