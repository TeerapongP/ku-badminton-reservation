"use client"

import { useState } from "react";
import Link from "next/link";
import { InputField } from "@/component/InputField";
import { Button } from "@/component/Button";
import { DropdownField } from "@/component/DropdownField";
import { DateField } from "@/component/DateField";

export default function RegisterContainner() {
    const [studentId, setStudentId] = useState('');
    const [nationnalId, setNationnalId] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickName] = useState('');
    const [userType, setUserType] = useState<"student" | "staff" | "guest">("student");
    const [prefix, setPrefix] = useState<string>("");
    const [dob, setDob] = useState<Date | null>(null);
    const [phone, setPhone] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    const [houseNumber, setHouseNumber] = useState<string>("");
    const [street, setStreet] = useState<string>("");
    const [tambon, setTambon] = useState<string | null>(null);
    const [district, setDistrict] = useState<string | null>(null);
    const [province, setProvince] = useState<string | null>(null);
    const [postalCode, setPostalCode] = useState<string | null>(null);
    const [selected, setSelected] = useState<{ label: string; value: string } | null>(null);
    const [filtered, setFiltered] = useState<{ label: string; value: string }[]>([]);
    const all = [
        { label: "นิสิต มก.", value: "student" },
        { label: "บุคลากร มก.", value: "staff" },
        { label: "บุคคลธรรมดา", value: "guest" },
    ];

    const searchItems = async (q: string) => {
        const s = q.trim().toLowerCase();
        return (s ? all.filter(o => o.label.toLowerCase().includes(s)) : all);
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
                            type="number"
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
                        {/* <AutoCompleteField
                            value={selected}
                            onChange={setSelected}
                            onSearch={searchItems}
                            optionLabel="label"
                            dropdown
                        />; */}
                        {/* <AutoCompleteComponent
                            items={items}
                            value={selected}
                            onChange={setSelected}
                            placeholder="เลือกประเทศ..."
                        /> */}
                    </div>

                    <div className="w-1/2">
                        {/* <AutoCompleteField
                            value={district}
                            onChange={(value) => setDistrict(value as string | null)}
                            onSearch={searchDistrict}
                            placeholder="พิมพ์ชื่ออำเภอ / เขต..."
                            dropdown
                        /> */}
                    </div>
                </div>

                <div className="mt-4 mb-4 flex gap-4">
                    <div className="w-1/2">
                        {/* <AutoCompleteField
                            value={province}
                            onChange={(value) => setProvince(value as string | null)}
                            onSearch={searchProvince}
                            placeholder="พิมพ์ชื่อจังหวัด..."
                            dropdown
                        /> */}
                    </div>

                    <div className="w-1/2">
                        {/* <AutoCompleteField
                            value={postalCode}
                            onChange={(value) => setPostalCode(value as string | null)}
                            onSearch={searchPostcode}
                            placeholder="พิมพ์รหัสไปรษณีย์..."
                            dropdown
                        /> */}
                    </div>
                </div>
            </div>
        </>
    );
}