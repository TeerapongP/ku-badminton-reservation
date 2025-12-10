"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Users, Info } from "lucide-react";
import { UploadResult } from "@/lib/UploadResult";

export default function StudentUpload() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // ตรวจสอบสิทธิ์
    if (status === "loading") {
        return <Loading size="lg" text="กำลังโหลด..." color="blue" fullScreen={true} />;
    }

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        router.push("/");
        return null;
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            const validExtensions = ['.xlsx', '.xls'];
            const fileExtension = droppedFile.name.substring(droppedFile.name.lastIndexOf('.')).toLowerCase();

            if (!validExtensions.includes(fileExtension)) {
                toast.showError("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)");
                return;
            }

            setFile(droppedFile);
            setResult(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validExtensions = ['.xlsx', '.xls'];
            const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

            if (!validExtensions.includes(fileExtension)) {
                toast.showError("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)");
                return;
            }

            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.showError("ไม่พบไฟล์", "กรุณาเลือกไฟล์ก่อนอัพโหลด");
            return;
        }

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('updateExisting', String(updateExisting));

            const response = await fetch('/api/admin/students/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
                toast.showSuccess("อัพโหลดสำเร็จ", `สร้างใหม่ ${data.created} คน, อัปเดต ${data.updated} คน`);
                setFile(null);
                // Reset file input
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถอัพโหลดไฟล์ได้");
                if (data.errors && data.errors.length > 0) {
                    setResult(data);
                }
            }
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setUploading(false);
        }
    };

    // Show loading screen while uploading
    if (uploading) {
        return (
            <Loading
                text="กำลังอัพโหลดและประมวลผลข้อมูล..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-violet-50 tw-via-purple-50 tw-to-fuchsia-50 tw-px-6 tw-py-12">
            {/* Animated Background Elements */}
            <div className="tw-fixed tw-inset-0 tw-overflow-hidden tw-pointer-events-none">
                <div className="tw-absolute tw-top-20 tw-right-20 tw-w-72 tw-h-72 tw-bg-purple-300 tw-rounded-full tw-mix-blend-multiply tw-filter tw-blur-xl tw-opacity-30 tw-animate-blob"></div>
                <div className="tw-absolute tw-top-40 tw-left-20 tw-w-72 tw-h-72 tw-bg-pink-300 tw-rounded-full tw-mix-blend-multiply tw-filter tw-blur-xl tw-opacity-30 tw-animate-blob tw-animation-delay-2000"></div>
                <div className="tw-absolute tw-bottom-20 tw-left-1/2 tw-w-72 tw-h-72 tw-bg-blue-300 tw-rounded-full tw-mix-blend-multiply tw-filter tw-blur-xl tw-opacity-30 tw-animate-blob tw-animation-delay-4000"></div>
            </div>

            {/* Header */}
            <div className="tw-text-center tw-mb-10">
                <h2 className="tw-text-5xl md:tw-text-6xl tw-font-extrabold tw-text-purple-600 tw-drop-shadow-sm">
                    อัปโหลดข้อมูลนิสิต
                </h2>
                <div className="tw-mx-auto tw-mt-3 tw-h-1.5 tw-w-40 tw-bg-gradient-to-r tw-from-violet-500 tw-to-fuchsia-500 tw-rounded-full"></div>
            </div>


            {/* Main Content */}
            <div className="tw-max-w-5xl tw-mx-auto tw-relative">
                {/* Upload Card */}
                <div className="tw-bg-white/80 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-2xl tw-border tw-border-white/50 tw-p-8 md:tw-p-10 tw-mb-8">
                    {/* File Upload Area */}
                    <div className="tw-mb-8">
                        <label className="tw-block tw-text-sm tw-font-semibold tw-text-gray-700 tw-mb-4 tw-flex tw-items-center tw-gap-2">
                            <FileSpreadsheet className="tw-w-5 tw-h-5 tw-text-purple-600" />
                            เลือกไฟล์ Excel
                        </label>
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`tw-relative tw-transition-all tw-duration-300 ${dragActive ? 'tw-scale-[1.02]' : ''
                                }`}
                        >
                            <label className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-border-2 tw-border-dashed tw-rounded-2xl tw-p-12 tw-cursor-pointer tw-transition-all tw-duration-300 ${dragActive
                                ? 'tw-border-purple-500 tw-bg-purple-50 tw-shadow-lg'
                                : file
                                    ? 'tw-border-green-400 tw-bg-green-50'
                                    : 'tw-border-gray-300 tw-bg-gradient-to-br tw-from-gray-50 tw-to-purple-50/30 hover:tw-border-purple-400 hover:tw-bg-purple-50/50 hover:tw-shadow-md'
                                }`}>
                                <div className={`tw-w-20 tw-h-20 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mb-4 tw-transition-all tw-duration-300 ${file ? 'tw-bg-green-100' : 'tw-bg-purple-100'
                                    }`}>
                                    <FileSpreadsheet className={`tw-w-10 tw-h-10 ${file ? 'tw-text-green-600' : 'tw-text-purple-600'
                                        }`} />
                                </div>

                                {file ? (
                                    <div className="tw-text-center">
                                        <div className="tw-flex tw-items-center tw-gap-2 tw-justify-center tw-mb-2">
                                            <CheckCircle className="tw-w-5 tw-h-5 tw-text-green-600" />
                                            <span className="tw-text-lg tw-font-semibold tw-text-green-700">
                                                {file.name}
                                            </span>
                                        </div>
                                        <p className="tw-text-sm tw-text-gray-500">
                                            ขนาดไฟล์: {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                        <p className="tw-text-xs tw-text-gray-400 tw-mt-2">
                                            คลิกเพื่อเลือกไฟล์ใหม่
                                        </p>
                                    </div>
                                ) : (
                                    <div className="tw-text-center">
                                        <p className="tw-text-lg tw-font-medium tw-text-gray-700 tw-mb-2">
                                            {dragActive ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวางที่นี่'}
                                        </p>
                                        <p className="tw-text-sm tw-text-gray-500 tw-mb-3">
                                            หรือคลิกเพื่อเลือกไฟล์
                                        </p>
                                        <div className="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-white tw-rounded-full tw-border tw-border-purple-200 tw-text-sm tw-text-purple-600 tw-font-medium">
                                            <Upload className="tw-w-4 tw-h-4" />
                                            รองรับไฟล์ .xlsx และ .xls
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="tw-hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="tw-mb-8 tw-p-5 tw-bg-gradient-to-r tw-from-purple-50 tw-to-pink-50 tw-rounded-xl tw-border tw-border-purple-100">
                        <label className="tw-flex tw-items-start tw-gap-4 tw-cursor-pointer tw-group">
                            <div className="tw-relative tw-flex tw-items-center tw-mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={updateExisting}
                                    onChange={(e) => setUpdateExisting(e.target.checked)}
                                    className="tw-w-6 tw-h-6 tw-text-purple-600 tw-rounded-md tw-border-2 tw-border-purple-300 focus:tw-ring-2 focus:tw-ring-purple-500 focus:tw-ring-offset-2 tw-cursor-pointer tw-transition-all"
                                />
                            </div>
                            <div className="tw-flex-1">
                                <span className="tw-text-base tw-font-medium tw-text-gray-800 tw-block tw-mb-1">
                                    อัปเดตข้อมูลนิสิตที่มีอยู่แล้ว
                                </span>
                                <span className="tw-text-sm tw-text-gray-600">
                                    หากพบรหัสนิสิตซ้ำ ระบบจะทำการอัปเดตข้อมูลแทนการข้ามรายการนั้น
                                </span>
                            </div>
                        </label>
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={[
                            'tw-w-full tw-h-12',
                            'tw-text-lg tw-font-semibold tw-text-white',
                            'tw-rounded-xl tw-shadow-lg hover:tw-shadow-xl',
                            'tw-transition-all tw-duration-300 hover:tw-scale-105 active:tw-scale-95',
                            'tw-relative tw-overflow-hidden',
                            'tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600',
                            'hover:tw-from-emerald-600 hover:tw-to-emerald-700',
                            'focus:tw-ring-4 focus:tw-ring-emerald-300 focus:tw-outline-none',
                            'disabled:tw-opacity-60 disabled:tw-cursor-not-allowed',
                            'tw-border-0 tw-outline-none'
                        ].join(' ')}
                    >
                        <div className="tw-absolute tw-inset-0 tw-bg-white/10 tw-opacity-0 hover:tw-opacity-10 tw-transition-opacity tw-duration-300" />


                        <>
                            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <Upload className="tw-w-6 tw-h-6" />
                                <span className="tw-leading-none">อัพโหลดไฟล์</span>
                            </div>

                        </>
                    </Button>


                </div>

                {/* Instructions Card */}
                <div className="tw-bg-gradient-to-br tw-from-blue-50 tw-to-indigo-50 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-xl tw-border tw-border-blue-100 tw-p-8 tw-mb-8">
                    <div className="tw-flex tw-items-start tw-gap-4 tw-mb-6">
                        <div className="tw-w-12 tw-h-12 tw-rounded-xl tw-bg-blue-600 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0 tw-shadow-lg">
                            <Info className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                        <div>
                            <h3 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-mb-2">
                                รูปแบบไฟล์ Excel ที่ต้องการ
                            </h3>
                            <p className="tw-text-sm tw-text-gray-600">
                                กรุณาตรวจสอบให้แน่ใจว่าไฟล์ Excel ของคุณมีรูปแบบดังนี้
                            </p>
                        </div>
                    </div>
                    <div className="tw-grid tw-gap-3">
                        {[
                            'ไฟล์ต้องมี column: รหัสนิสิต, คำนำหน้าชื่อ(ไทย), ชื่อ(ไทย), นามสกุล(ไทย), E-mail, โทรศัพท์มือถือ, คณะ/หน่วยงานที่เทียบเท่า, ชื่อภาควิชา',
                            'รหัสนิสิตต้องเป็นตัวเลข 8-10 หลัก',
                            'เบอร์โทรต้องเป็นรูปแบบ 0XXXXXXXXX (10 หลัก)',
                            'รหัสผ่านเริ่มต้นจะเป็นรหัสนิสิต',
                            'ถ้าไม่มี Email จะสร้างเป็น รหัสนิสิต@ku.th'
                        ].map((item, index) => (
                            <div key={index} className="tw-flex tw-items-start tw-gap-3 tw-p-4 tw-bg-white/60 tw-rounded-xl tw-backdrop-blur-sm">
                                <div className="tw-w-6 tw-h-6 tw-rounded-full tw-bg-blue-600 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0 tw-mt-0.5">
                                    <span className="tw-text-xs tw-font-bold tw-text-white">{index + 1}</span>
                                </div>
                                <span className="tw-text-sm tw-text-gray-700 tw-leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Result Section */}
                {result && (
                    <div className="tw-bg-white/80 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-2xl tw-border tw-border-white/50 tw-p-8 md:tw-p-10 tw-animate-fadeIn">
                        <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
                            <div className="tw-w-14 tw-h-14 tw-rounded-2xl tw-bg-gradient-to-br tw-from-purple-500 tw-to-pink-500 tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                                <Users className="tw-w-7 tw-h-7 tw-text-white" />
                            </div>
                            <h2 className="tw-text-3xl tw-font-bold tw-bg-gradient-to-r tw-from-purple-600 tw-to-pink-600 tw-bg-clip-text tw-text-transparent">
                                ผลการอัพโหลด
                            </h2>
                        </div>

                        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6 tw-mb-8">
                            {[
                                { icon: CheckCircle, count: result.created, label: 'สร้างใหม่', color: 'green', gradient: 'from-green-400 to-emerald-500' },
                                { icon: CheckCircle, count: result.updated, label: 'อัปเดต', color: 'blue', gradient: 'from-blue-400 to-cyan-500' },
                                { icon: XCircle, count: result.skipped, label: 'ข้าม', color: 'gray', gradient: 'from-gray-400 to-slate-500' }
                            ].map((stat, index) => (
                                <div key={index} className={`tw-relative tw-p-6 tw-bg-gradient-to-br tw-from-${stat.color}-50 tw-to-${stat.color}-100 tw-rounded-2xl tw-border-2 tw-border-${stat.color}-200 tw-shadow-lg hover:tw-shadow-xl tw-transition-all tw-duration-300 hover:tw-scale-105`}>
                                    <div className="tw-flex tw-items-start tw-justify-between tw-mb-4">
                                        <div className={`tw-w-12 tw-h-12 tw-rounded-xl tw-bg-gradient-to-br ${stat.gradient} tw-flex tw-items-center tw-justify-center tw-shadow-md`}>
                                            <stat.icon className="tw-w-6 tw-h-6 tw-text-white" />
                                        </div>
                                        <div className={`tw-text-4xl tw-font-black tw-bg-gradient-to-br ${stat.gradient} tw-bg-clip-text tw-text-transparent`}>
                                            {stat.count}
                                        </div>
                                    </div>
                                    <div className={`tw-text-sm tw-font-semibold tw-text-${stat.color}-700 tw-uppercase tw-tracking-wide`}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="tw-p-6 tw-bg-gradient-to-br tw-from-red-50 tw-to-pink-50 tw-rounded-2xl tw-border-2 tw-border-red-200 tw-shadow-lg">
                                <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
                                    <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-red-600 tw-flex tw-items-center tw-justify-center tw-shadow-md">
                                        <AlertTriangle className="tw-w-5 tw-h-5 tw-text-white" />
                                    </div>
                                    <h3 className="tw-text-lg tw-font-bold tw-text-red-800">
                                        ข้อผิดพลาด ({result.errors.length} รายการ)
                                    </h3>
                                </div>
                                <div className="tw-bg-white/60 tw-backdrop-blur-sm tw-rounded-xl tw-p-4 tw-max-h-60 tw-overflow-y-auto tw-space-y-2">
                                    {result.errors.map((error: string, index: number) => (
                                        <div key={index} className="tw-flex tw-items-start tw-gap-3 tw-p-3 tw-bg-red-50/80 tw-rounded-lg">
                                            <div className="tw-w-6 tw-h-6 tw-rounded-full tw-bg-red-100 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0 tw-mt-0.5">
                                                <span className="tw-text-xs tw-font-bold tw-text-red-600">{index + 1}</span>
                                            </div>
                                            <span className="tw-text-sm tw-text-red-700 tw-leading-relaxed">{error}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}