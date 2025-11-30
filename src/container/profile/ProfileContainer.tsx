"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { User, Calendar, Edit2, Save, X, Camera, Shield, CreditCard, Users, Mail, Phone } from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import Loading from "@/components/Loading";
import { UserProfile } from "@/types/profile/types";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";
import { RoleColors } from "@/lib/RoleColors";

const ProfileContainer: React.FC = () => {
    const { data: session } = useSession();
    const toast = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [userData, setUserData] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState<UserProfile | null>(null);
    const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
    const lastFetchedIdRef = useRef<string | null>(null);

    const fetchUserProfile = useCallback(async (id: string) => {
        try {
            setIsLoading(true);

            const res = await fetch(`/api/profile/${id}`);
            if (!res.ok) {
                toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
                return;
            }
            const data = await res.json();
            setUserData(data.user);
            setFormData(data.user);
        } catch (err: any) {
            console.error("Profile fetch error:", err);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้");
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const id = session?.user?.id;
        if (!id) return;

        // ป้องกันการดึงซ้ำถ้า id เดิม
        if (lastFetchedIdRef.current === id) return;
        lastFetchedIdRef.current = id;

        fetchUserProfile(id);
    }, [session?.user?.id, fetchUserProfile]);
    // Decrypt profile image URL when userData changes
    useEffect(() => {
        if (userData?.profile_photo_url && !decryptedImageUrl) {
            decryptImageUrl(userData.profile_photo_url);
        }
    }, [userData?.profile_photo_url, decryptedImageUrl]);

    const decryptImageUrl = async (encryptedUrl: string) => {
        // Check if URL is already decrypted (starts with http or /)
        if (encryptedUrl.startsWith('http') || encryptedUrl.startsWith('/')) {
            setDecryptedImageUrl(encryptedUrl);
            return;
        }

        try {
            const response = await fetch('/api/decrypt/image-path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ encryptedPath: encryptedUrl }),
            });

            if (response.ok) {
                const data = await response.json();
                setDecryptedImageUrl(data.imagePath);
            } else {
                setDecryptedImageUrl('https://via.placeholder.com/150');
            }
        } catch (error) {
            setDecryptedImageUrl('https://via.placeholder.com/150');
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setFormData(userData);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(userData);
    };

    const handleSave = async () => {
        if (!formData || isSaving) return;
        setIsSaving(true);

        try {
            let finalImagePath = formData.profile_photo_url;

            // Check if there's a temporary image file to upload
            if ((formData as any)._tempImageFile) {
                const file = (formData as any)._tempImageFile;

                // Upload the image file
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);
                uploadFormData.append('userId', session?.user?.id ?? '');

                const uploadResponse = await fetch('/api/upload/profile-image', {
                    method: 'POST',
                    body: uploadFormData,
                });

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    // Use imagePath from response (already encrypted)
                    finalImagePath = uploadData.data?.imagePath;
                } else {
                    const errorData = await uploadResponse.json();
                    toast.showError("เกิดข้อผิดพลาด", errorData.message ?? "ไม่สามารถอัปโหลดรูปภาพได้");
                    return;
                }
            }

            // Image path is already encrypted from upload API
            const encryptedImagePath = finalImagePath;

            // Prepare data for profile update (remove temp file)
            const { _tempImageFile, ...profileData } = formData as any;
            const updateData = {
                ...profileData,
                profile_photo_url: encryptedImagePath
            };

            const response = await fetch(`/api/profile/${session?.user?.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                const data = await response.json();
                setUserData(data.user);
                setIsEditing(false);
                toast.showSuccess("บันทึกสำเร็จ", "ข้อมูลโปรไฟล์ได้รับการอัปเดตแล้ว");
            } else {
                toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
            }
        } catch (error) {
            console.error("Profile update error:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof UserProfile, value: any) => {
        if (!formData) return;
        setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.showError("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)");
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.showError("ไฟล์ใหญ่เกินไป", "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB");
            return;
        }

        try {
            setIsUploadingImage(true);

            // Create temporary preview using FileReader
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;

                // Store both the preview URL and the file for later upload
                setFormData((prev) => prev ? {
                    ...prev,
                    profile_photo_url: imageUrl,
                    _tempImageFile: file // Store file temporarily
                } : null);

                toast.showSuccess("เลือกรูปสำเร็จ", "กรุณากดบันทึกเพื่อยืนยันการเปลี่ยนแปลง");
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error("Image preview error:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถแสดงตัวอย่างรูปภาพได้");
        } finally {
            setIsUploadingImage(false);
            // Reset input value
            event.target.value = '';
        }
    };

    const handleViewBookings = () => {
        window.location.href = "/profile/bookings";
    };

    const getRoleBadgeColor = (role: keyof RoleColors): string => {
        const colors: RoleColors = {
            admin: "tw-bg-purple-100 tw-text-purple-800",
            staff: "tw-bg-blue-100 tw-text-blue-800",
            student: "tw-bg-green-100 tw-text-green-800",
            guest: "tw-bg-gray-100 tw-text-gray-800",
            'super_admin': "tw-bg-red-100 tw-text-red-800",
        };
        return colors[role] || "tw-bg-gray-100 tw-text-gray-800";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const hasIdInfo = !!(userData?.student_id ?? userData?.staff_id);

    if (isLoading) {
        return (
            <Loading
                text="กำลังโหลดข้อมูลโปรไฟล์..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    if (!userData || !formData) {
        return (
            <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-emerald-50 tw-flex tw-items-center tw-justify-center">
                <div className="tw-text-center tw-bg-white tw-rounded-2xl tw-p-8 tw-shadow-xl">
                    <h1 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-mb-4">
                        ไม่พบข้อมูลโปรไฟล์
                    </h1>
                    <p className="tw-text-gray-600">กรุณาเข้าสู่ระบบใหม่อีกครั้ง</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-blue-50 tw-via-white tw-to-green-50 tw-py-8 tw-px-4">
            <div className="tw-max-w-5xl tw-mx-auto">
                {/* Header */}
                <div className="tw-mb-6">
                    <h1 className="tw-text-3xl tw-font-bold tw-text-gray-900">โปรไฟล์ของฉัน</h1>
                    <p className="tw-text-gray-600 tw-mt-1">จัดการข้อมูลส่วนตัวของคุณ</p>
                </div>

                {/* Main Profile Card */}
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-overflow-hidden">
                    {/* Cover Photo */}
                    <div className="tw-h-36 tw-bg-gradient-to-r tw-from-blue-500 tw-to-emerald-500" />

                    {/* Profile Header */}
                    <div className="tw-relative tw-px-6 tw-pb-6">
                        <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-center sm:tw-items-end tw-gap-4 -tw-mt-16">

                            <div className="tw-relative tw-group tw-w-32 tw-h-32">
                                {/* รูปโปรไฟล์ */}
                                <img
                                    src={
                                        // If editing and has temp image, show temp image
                                        isEditing && formData?.profile_photo_url?.startsWith('data:')
                                            ? formData.profile_photo_url
                                            // Otherwise use decrypted URL or fallback
                                            : decryptedImageUrl || "https://via.placeholder.com/150"
                                    }
                                    alt="Profile"
                                    className="tw-w-32 tw-h-32 tw-rounded-full tw-border-4 tw-border-white tw-shadow-lg tw-object-cover tw-transition-all tw-duration-300 group-hover:tw-brightness-90"
                                />

                                {/* Overlay ตอน hover */}
                                {isEditing && (
                                    <>
                                        <div className="tw-absolute tw-inset-0 tw-bg-black/40 tw-rounded-full tw-opacity-0 group-hover:tw-opacity-100 tw-transition tw-flex tw-items-center tw-justify-center">
                                            <label
                                                htmlFor="upload-profile-photo"
                                                className={`tw-flex tw-items-center tw-justify-center tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-rounded-full tw-p-3 tw-cursor-pointer tw-shadow-md tw-transition ${isUploadingImage ? 'tw-opacity-50 tw-cursor-not-allowed' : ''}`}
                                                title={isUploadingImage ? "กำลังอัปโหลด..." : "อัปโหลดรูปโปรไฟล์"}
                                            >
                                                {isUploadingImage ? (
                                                    <div className="tw-animate-spin tw-w-5 tw-h-5 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></div>
                                                ) : (
                                                    <Camera size={20} />
                                                )}
                                            </label>
                                        </div>

                                        <input
                                            id="upload-profile-photo"
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            className="tw-hidden"
                                            onChange={handleImageUpload}
                                            disabled={isUploadingImage}
                                        />
                                    </>
                                )}
                            </div>


                            {/* Name and Role */}
                            <div className="tw-flex-1 tw-text-center sm:tw-text-left sm:tw-ml-4 tw-mt-2">
                                <h2 className="tw-text-2xl tw-font-bold tw-text-gray-900">
                                    {userData.title_en} {userData.first_name} {userData.last_name}
                                </h2>

                                <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-3 tw-justify-center sm:tw-justify-start">
                                    {/* Role Badge */}
                                    <span
                                        className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold tw-shadow-sm ${getRoleBadgeColor(
                                            userData.role
                                        )}`}
                                    >
                                        {userData.role.toUpperCase()}
                                    </span>

                                    {/* Membership Badge */}
                                    <span
                                        className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${userData.membership === "member"
                                            ? "tw-bg-yellow-100 tw-text-yellow-800"
                                            : "tw-bg-gray-100 tw-text-gray-700"
                                            }`}
                                    >
                                        {userData.membership === "member" ? "สมาชิก" : "ไม่ใช่สมาชิก"}
                                    </span>
                                </div>

                            </div>

                            {/* Actions */}
                            <div className="sm:tw-ml-auto tw-w-full sm:tw-w-auto">
                                {!isEditing ? (
                                    <Button
                                        onClick={handleEdit}
                                        className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-lg tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                                        colorClass="tw-bg-blue-600 tw-text-white tw-rounded-lg hover:tw-bg-blue-700 focus:tw-ring-4 focus:tw-ring-blue-300"
                                    >
                                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                            <Edit2 size={18} />
                                            แก้ไขโปรไฟล์
                                        </span>
                                    </Button>

                                ) : (
                                    <div className="tw-flex tw-gap-2 tw-flex-col sm:tw-flex-row">
                                        <Button
                                            onClick={handleSave}
                                            className="tw-flex tw-items-center tw-justify-center tw-gap-2 
             tw-px-8 tw-py-3 tw-text-lg tw-font-semibold 
             tw-rounded-xl tw-shadow-md tw-transition-all tw-duration-300 tw-ease-in-out 
             tw-border-0 tw-outline-none focus:tw-outline-none
             tw-bg-gradient-to-r tw-from-emerald-500 tw-to-green-600
             hover:tw-from-emerald-600 hover:tw-to-green-700 
             hover:tw-shadow-lg hover:tw-scale-[1.03]
             active:tw-scale-95
             focus:tw-ring-4 focus:tw-ring-emerald-300
             disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                                        >
                                            <Save size={20} className="tw-text-white tw-drop-shadow-sm" />
                                            <span className="tw-text-white tw-tracking-wide">บันทึก</span>
                                        </Button>

                                        <Button
                                            onClick={handleCancel}
                                            className="tw-flex tw-items-center tw-justify-center tw-gap-2 
             tw-px-8 tw-py-3 tw-text-lg tw-font-semibold 
             tw-rounded-xl tw-shadow-md tw-transition-all tw-duration-300 tw-ease-in-out 
             tw-border-0 tw-outline-none focus:tw-outline-none
             tw-bg-gradient-to-r tw-from-gray-400 tw-to-gray-500
             hover:tw-from-gray-500 hover:tw-to-gray-600 
             hover:tw-shadow-lg hover:tw-scale-[1.03]
             active:tw-scale-95
             focus:tw-ring-4 focus:tw-ring-gray-300
             disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                                        >
                                            <X size={20} className="tw-text-white tw-drop-shadow-sm" />
                                            <span className="tw-text-white tw-tracking-wide">ยกเลิก</span>
                                        </Button>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="tw-px-6 tw-pb-6">
                        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
                            {/* Account Information */}
                            <div className="tw-space-y-4">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center tw-gap-2">
                                    <User size={20} className="tw-text-blue-600" />
                                    ข้อมูลบัญชี
                                </h3>

                                <div className="tw-space-y-3">
                                    <div className="tw-relative">
                                        <User size={18} className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-gray-400 tw-pointer-events-none tw-z-10" />
                                        <InputField
                                            type="text"
                                            placeholder="Username"
                                            value={formData.username}
                                            onChange={(value) => handleInputChange("username", value)}
                                            disabled={!isEditing}
                                            required
                                            className="tw-pl-10"
                                        />
                                    </div>

                                    <div className="tw-relative">
                                        <Mail size={18} className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-gray-400 tw-pointer-events-none tw-z-10" />
                                        <InputField
                                            type="email"
                                            placeholder="Email"
                                            value={formData.email}
                                            onChange={(value) => handleInputChange("email", value)}
                                            disabled={!isEditing}
                                            required
                                            className="tw-pl-10"
                                        />
                                    </div>

                                    <div className="tw-relative">
                                        <Phone size={18} className="tw-absolute tw-left-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-gray-400 tw-pointer-events-none tw-z-10" />
                                        <InputField
                                            type="tel"
                                            placeholder="เบอร์โทรศัพท์"
                                            value={formData.phone ?? ""}
                                            onChange={(value) => handleInputChange("phone", value)}
                                            disabled={!isEditing}
                                            className="tw-pl-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div className="tw-space-y-4">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center tw-gap-2">
                                    <CreditCard size={20} className="tw-text-green-600" />
                                    ข้อมูลส่วนตัว
                                </h3>

                                <div className="tw-space-y-3">
                                    <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                                        <InputField
                                            type="text"
                                            placeholder="คำนำหน้า (ไทย)"
                                            value={formData.title_th ?? ""}
                                            onChange={(value) => handleInputChange("title_th", value)}
                                            disabled={!isEditing}
                                        />
                                        <InputField
                                            type="text"
                                            placeholder="คำนำหน้า (อังกฤษ)"
                                            value={formData.title_en ?? ""}
                                            onChange={(value) => handleInputChange("title_en", value)}
                                            disabled={!isEditing}
                                        />
                                    </div>

                                    <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                                        <InputField
                                            type="text"
                                            placeholder="ชื่อจริง"
                                            value={formData.first_name}
                                            onChange={(value) => handleInputChange("first_name", value)}
                                            disabled={!isEditing}
                                            required
                                        />
                                        <InputField
                                            type="text"
                                            placeholder="นามสกุล"
                                            value={formData.last_name}
                                            onChange={(value) => handleInputChange("last_name", value)}
                                            disabled={!isEditing}
                                            required
                                        />
                                    </div>




                                </div>
                            </div>

                            {/* ID Information */}
                            {hasIdInfo && (
                                <div className="tw-space-y-4">
                                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center tw-gap-2">
                                        <Shield size={20} className="tw-text-purple-600" />
                                        รหัสประจำตัว
                                    </h3>

                                    <div className="tw-space-y-3">
                                        {userData.student_id && (
                                            <InputField
                                                type="text"
                                                placeholder="รหัสนักศึกษา"
                                                value={formData.student_id ?? ""}
                                                disabled={true}
                                            />
                                        )}
                                        {userData.staff_id && (
                                            <InputField
                                                type="text"
                                                placeholder="รหัสบุคลากร"
                                                value={formData.staff_id ?? ""}
                                                disabled={true}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Account Status */}
                            <div className="tw-space-y-4">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center tw-gap-2">
                                    <Calendar size={20} className="tw-text-orange-600" />
                                    ข้อมูลบัญชี
                                </h3>

                                <div className="tw-space-y-3">
                                    <InputField
                                        type="text"
                                        placeholder="วันที่สมัครสมาชิก"
                                        value={formatDate(userData.registered_at)}
                                        disabled={true}
                                    />
                                    {userData.last_login_at && (
                                        <InputField
                                            type="text"
                                            placeholder="เข้าสู่ระบบล่าสุด"
                                            value={formatDate(userData.last_login_at)}
                                            disabled={true}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Actions */}
                <div className="tw-mt-8">
                    <Button
                        type="button"
                        onClick={handleViewBookings}
                        className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2
               tw-px-8 tw-py-3 tw-text-lg tw-font-semibold
               tw-rounded-xl tw-transition-all tw-duration-300 tw-ease-in-out 
               tw-border-0 tw-outline-none tw-shadow-md 
               tw-bg-gradient-to-r tw-from-sky-500 tw-to-cyan-600 
               hover:tw-from-sky-600 hover:tw-to-cyan-700 
               hover:tw-shadow-lg hover:tw-scale-[1.02]
               active:tw-scale-95 focus:tw-ring-4 focus:tw-ring-sky-300
               disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                    >
                        <Users size={22} className="tw-text-white tw-drop-shadow-sm" />
                        <span className="tw-text-white tw-tracking-wide">ประวัติการจอง</span>
                    </Button>
                </div>


            </div>
        </div>
    );
};

export default ProfileContainer;