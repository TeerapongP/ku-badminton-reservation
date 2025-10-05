"use client"

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";
import { DropdownField } from "@/component/DropdownField";
import { DateField } from "@/component/DateField";
import AutoCompleteField from "@/component/AutoCompleteField";

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
    const [tambon, setTambon] = useState<string | undefined>(undefined);
    const [district, setDistrict] = useState<string | undefined>(undefined);
    const [province, setProvince] = useState<string | undefined>(undefined);
    const [postalCode, setPostalCode] = useState<string | undefined>(undefined);
    const [faculty, setFaculty] = useState<number | null>();
    const [department, setDepartment] = useState<number | null>();
    const [levelStudy, setLevelStudy] = useState<number | null>();
    const [office, setOffice] = useState<string | null>(null);
    const [jobtitle, setJobtitle] = useState<string | null>(null);
    const [staffType, setStaffType] = useState<string | null>(null);

    const searchTambon = async (q: string): Promise<string[]> => {
        // mock data ชุดตัวอย่าง
        const tambonList = [
            "ลาดพร้าว",
            "จตุจักร",
            "บางซื่อ",
            "ห้วยขวาง",
            "วังทองหลาง",
            "สะพานพุทธ",
        ];
        const s = q.trim().toLowerCase();
        await new Promise((r) => setTimeout(r, 300));
        return s
            ? tambonList.filter((t) => t.toLowerCase().includes(s))
            : tambonList;
    };


    const today = new Date();
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const userTypes = [
        { label: "นิสิต มก.", name: "student", value: "student" },
        { label: "บุคลากร มก.", name: "staff", value: "staff" },
        { label: "บุคคลธรรมดา", name: "guest", value: "guest" },
    ];
    const prefixTitles = [
        { label: "นาย", value: "mr" },
        { label: "นางสาว", value: "ms" },
        { label: "นาง", value: "mrs" },
        { label: "ดร.", value: "dr" },
        { label: "ศ.", value: "prof" },
        { label: "ผศ.", value: "Asst" }
    ];
    const levelStudyDropdown = [
        { label: "ปริญญาตรี", name: "bachelor", value: "bachelor" },
        { label: "ปริญญาโท", name: "master", value: "master" },
        { label: "ปริญญาเอก", name: "doctorate", value: "doctorate" },
    ];

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
                        options={userTypes}
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
                <div className="mt-4 flex gap-4">
                    <div className="w-1/3">
                        <DropdownField
                            placeholder="คำนำหน้า"
                            value={prefix}
                            onChange={setPrefix}
                            options={prefixTitles}
                            optionLabel="label"
                            required
                        />
                    </div>
                    <div className="w-1/3">
                        <InputField
                            type="text"
                            placeholder="ชื่อ"
                            value={firstName}
                            onChange={(val) => setFirstName(val as string)}
                            required
                        />
                    </div>

                    <div className="w-1/3">
                        <InputField
                            type="text"
                            placeholder="นามสกุล"
                            value={lastName}
                            onChange={(val) => setLastName(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="w-1/2">
                        <InputField
                            type="text"
                            placeholder="ชื่อเล่น"
                            value={nickname}
                            onChange={(val) => setNickName(val as string)}
                            required
                        />
                    </div>

                    <div className="w-1/2">
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
                <div className="mt-4 flex gap-4">
                    <div className="w-1/2">
                        <InputField
                            type="tel"
                            placeholder="กรอกเบอร์โทรศัพท์"
                            value={phone}
                            maxLength={10}
                            onChange={(val) => setPhone(val as string)}
                            required
                        />

                    </div>

                    <div className="w-1/2">
                        <InputField
                            type="email"
                            placeholder="กรอกอีเมล"
                            value={email}
                            onChange={(val) => setEmail(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 mb-4 flex gap-4">
                    <div className="w-1/2">
                        <InputField
                            type="text"
                            placeholder="บ้านเลขที่"
                            value={houseNumber}
                            onChange={(val) => setHouseNumber(val as string)}
                            required
                        />
                    </div>
                    <div className="w-1/2">
                        <InputField
                            type="text"
                            placeholder="ถนน"
                            value={street}
                            onChange={(val) => setStreet(val as string)}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 mb-4 flex gap-4">
                    <div className="w-1/2">
                        <AutoCompleteField
                            placeholder="พิมพ์ชื่อตำบล"
                            value={tambon}
                            onChange={(value) => setTambon(value ?? undefined)}
                            onSearch={searchTambon}
                            required
                        />
                    </div>
                    <div className="w-1/2">
                        <AutoCompleteField
                            placeholder="พิมพ์ชื่ออำเภอ"
                            value={district}
                            onChange={(value) => setDistrict(value ?? undefined)}
                            onSearch={searchTambon}
                            required
                        />
                    </div>
                </div>
                <div className="mt-4 mb-4 flex gap-4">
                    <div className="w-1/2">
                        <AutoCompleteField
                            placeholder="พิมพ์ชื่อจังหวัด"
                            value={province}
                            onChange={(value) => setProvince(value ?? undefined)}
                            onSearch={searchTambon}
                            required
                        />
                    </div>
                    <div className="w-1/2">
                        <AutoCompleteField
                            placeholder="พิมพ์รหัสไปรษณีย์"
                            value={postalCode}
                            onChange={(value) => setPostalCode(value ?? undefined)}
                            onSearch={searchTambon}
                            required
                        />
                    </div>
                </div>

                {userType === "student" && (
                    <div className="mt-4 mb-4 flex gap-4">
                        <div className="w-1/3">
                            <DropdownField
                                placeholder="คณะ"
                                value={faculty}
                                onChange={setFaculty}
                                options={userTypes}
                                optionLabel="label"
                                required
                            />
                        </div>
                        <div className="w-1/3">
                            <DropdownField
                                placeholder="สาขา"
                                value={department}
                                onChange={setDepartment}
                                options={userTypes}
                                optionLabel="label"
                                required
                            />
                        </div>
                        <div className="w-1/3">
                            <DropdownField
                                placeholder="ระดับการศึกษา"
                                value={levelStudy}
                                onChange={setLevelStudy}
                                options={levelStudyDropdown}
                                optionLabel="label"
                                required
                            />
                        </div>
                    </div>
                )}
                {userType === "staff" && (
                    <div className="flex flex-wrap gap-4 w-full">
                        {/* หน่วยงาน/สังกัด */}
                        <div className="w-full sm:w-1/3">
                            <DropdownField
                                placeholder="หน่วยงาน/สังกัด"
                                value={office}
                                onChange={setOffice}
                                options={[]}
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
                                options={[]}
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
                                options={[]}
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
                {/* Divider */}
                <div className="relative mt-4 mb-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-sm text-gray-400"></span>
                    </div>
                </div>

                {/* Register */}
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