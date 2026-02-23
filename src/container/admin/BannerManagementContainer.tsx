"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    Upload,
    Save,
    Image as ImageIcon,
    RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAdminRole } from "@/hooks/useAdminRole";
import Loading from "@/components/Loading";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Banner, BannerFormData, BannerResponse, BannerUploadResponse } from "@/types/banner";

const BannerManagementContainer: React.FC = () => {
    const router = useRouter();
    const toast = useToast();
    const { session, status, isAdmin, loading: roleLoading } = useAdminRole();

    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState<BannerFormData>({
        title: "",
        subtitle: "",
        image_path: "",
        is_active: true,
        display_order: 1
    });

    const [previewImage, setPreviewImage] = useState<string>("");

    const fetchBanners = useCallback(async () => {
        try {
            setIsLoading(true);

            const response = await fetch('/api/admin/banners');

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Response error:", errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data: BannerResponse = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setBanners(data.data);
            } else {
                console.error("API returned error:", data.error);
                toast.showError("เกิดข้อผิดพลาด", data.error ?? "ไม่สามารถโหลดข้อมูล banner ได้");
            }
        } catch (error) {
            console.error("Error fetching banners:", error);
            toast.showError("เกิดข้อผิดพลาด", `ไม่สามารถโหลดข้อมูล banner ได้: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        if (roleLoading || status === "loading") {
            console.log("[BannerManagement] Waiting for auth...", { roleLoading, status });
            return;
        }
        if (!session || !isAdmin) {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchBanners();
    }, [session, status, isAdmin, roleLoading, router, toast, fetchBanners]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchBanners();
    };

    const resetForm = () => {
        setFormData({
            title: "",
            subtitle: "",
            image_path: "",
            is_active: true,
            display_order: 1
        });
        setPreviewImage("");
        setEditingBanner(null);
    };

    const handleCreateNew = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const handleEdit = (banner: Banner) => {
        setFormData({
            title: banner.title,
            subtitle: banner.subtitle || "",
            image_path: banner.image_path,
            is_active: banner.is_active,
            display_order: banner.display_order
        });
        setPreviewImage(banner.image_path);
        setEditingBanner(banner);
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        resetForm();
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

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.showError("ไฟล์ใหญ่เกินไป", "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB");
            return;
        }

        try {
            setIsUploading(true);

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            const response = await fetch('/api/admin/banners/upload', {
                method: 'POST',
                body: uploadFormData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data: BannerUploadResponse = await response.json();

            if (data.success && data.data) {
                setFormData(prev => ({ ...prev, image_path: data.data!.url }));
                setPreviewImage(data.data.url);
                toast.showSuccess("อัปโหลดสำเร็จ", "อัปโหลดรูปภาพเรียบร้อยแล้ว");
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถอัปโหลดไฟล์ได้");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถอัปโหลดไฟล์ได้");
        } finally {
            setIsUploading(false);
            // Reset input value
            event.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.image_path) {
            toast.showError("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อ banner และเลือกรูปภาพ");
            return;
        }

        try {
            setIsSubmitting(true);

            const url = editingBanner
                ? `/api/admin/banners/${editingBanner.id}`
                : '/api/admin/banners';

            const method = editingBanner ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Submit failed');
            }

            const data: BannerResponse = await response.json();

            if (data.success) {
                toast.showSuccess(
                    "บันทึกสำเร็จ",
                    editingBanner ? "แก้ไข banner เรียบร้อยแล้ว" : "สร้าง banner เรียบร้อยแล้ว"
                );
                handleCloseModal();
                fetchBanners();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถบันทึกข้อมูลได้");
            }
        } catch (error) {
            console.error("Error submitting banner:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (banner: Banner) => {
        try {
            const response = await fetch(`/api/admin/banners/${banner.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...banner,
                    is_active: !banner.is_active
                }),
            });

            if (!response.ok) {
                throw new Error('Toggle failed');
            }

            const data: BannerResponse = await response.json();

            if (data.success) {
                toast.showSuccess(
                    "อัปเดตสำเร็จ",
                    banner.is_active ? "ซ่อน banner แล้ว" : "แสดง banner แล้ว"
                );
                fetchBanners();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถอัปเดตสถานะได้");
            }
        } catch (error) {
            console.error("Error toggling banner status:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะได้");
        }
    };

    const handleDelete = async (banner: Banner) => {
        if (!confirm(`คุณต้องการลบ banner "${banner.title}" หรือไม่?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/banners/${banner.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            const data: BannerResponse = await response.json();

            if (data.success) {
                toast.showSuccess("ลบสำเร็จ", "ลบ banner เรียบร้อยแล้ว");
                fetchBanners();
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถลบ banner ได้");
            }
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถลบ banner ได้");
        }
    };

    if (status === "loading" || roleLoading || (isLoading && !isRefreshing)) {
        return (
            <Loading
                text="กำลังโหลดข้อมูล banner..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    if (!session || !isAdmin) {
        return null;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-blue-50 tw-via-white tw-to-green-50 tw-py-8 tw-px-4">
            <div className="tw-max-w-7xl tw-mx-auto">
                {/* Header */}
                <div className="tw-mb-6">
                    <div className="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-4">
                        <div>
                            <h1 className="tw-text-3xl tw-font-bold tw-text-gray-900">จัดการ Banner</h1>
                            <p className="tw-text-gray-600 tw-mt-1">
                                จัดการ banner สำหรับแสดงผลหน้าแรก ({banners.length} รายการ)
                            </p>
                        </div>

                        <div className="tw-flex tw-gap-2">
                            <Button
                                onClick={handleRefresh}
                                className="tw-h-11 tw-px-5 tw-font-semibold tw-rounded-xl tw-transition-all tw-duration-300 tw-shadow-md hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                            >
                                <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                    <RefreshCw className="tw-w-4 tw-h-4 tw-transition-transform group-hover:tw-rotate-180 tw-duration-300" />
                                    รีเฟรช
                                </span>
                            </Button>

                            <Button
                                onClick={handleCreateNew}
                                className="
    tw-flex tw-items-center tw-gap-2 
    tw-h-11 tw-px-5 tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-md hover:tw-shadow-lg 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                colorClass="
    tw-bg-gradient-to-r 
    tw-from-indigo-500 tw-to-blue-600
    hover:tw-from-indigo-600 hover:tw-to-blue-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-indigo-300/50
  "
                            >
                                <Plus className="tw-w-4 tw-h-4" />
                                เพิ่ม Banner
                            </Button>

                        </div>
                    </div>
                </div>

                {/* Banners Grid */}
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
                    {banners.length === 0 ? (
                        <div className="tw-col-span-full tw-bg-white tw-rounded-xl tw-shadow-md tw-p-12 tw-text-center">
                            <ImageIcon size={48} className="tw-text-gray-400 tw-mx-auto tw-mb-4" />
                            <h3 className="tw-text-xl tw-font-semibold tw-text-gray-900 tw-mb-2">
                                ยังไม่มี Banner
                            </h3>
                            <p className="tw-text-gray-600 tw-mb-4">
                                เริ่มต้นสร้าง banner แรกของคุณ
                            </p>
                            <Button
                                onClick={handleCreateNew}
                                className="
    tw-flex tw-items-center tw-gap-2 
    tw-h-11 tw-px-6 tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-md hover:tw-shadow-lg 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
    tw-mx-auto
  "
                                colorClass="
    tw-bg-gradient-to-r 
    tw-from-indigo-500 tw-to-blue-600
    hover:tw-from-indigo-600 hover:tw-to-blue-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-indigo-300/50
  "
                            >
                                <Plus className="tw-w-4 tw-h-4" />
                                เพิ่ม Banner
                            </Button>

                        </div>
                    ) : (
                        banners.map((banner) => (
                            <div
                                key={banner.id}
                                className="tw-bg-white tw-rounded-xl tw-shadow-md tw-overflow-hidden tw-transition-all tw-duration-200 hover:tw-shadow-lg"
                            >
                                {/* Banner Image */}
                                <div className="tw-relative tw-h-48 tw-bg-gray-200">
                                    <img
                                        src={banner.image_path}
                                        alt={banner.title}
                                        className="tw-w-full tw-h-full tw-object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image';
                                        }}
                                    />

                                    {/* Status Badge */}
                                    <div className="tw-absolute tw-top-2 tw-right-2">
                                        <span
                                            className={`tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${banner.is_active
                                                ? 'tw-bg-green-100 tw-text-green-800'
                                                : 'tw-bg-red-100 tw-text-red-800'
                                                }`}
                                        >
                                            {banner.is_active ? 'แสดง' : 'ซ่อน'}
                                        </span>
                                    </div>

                                    {/* Display Order */}
                                    <div className="tw-absolute tw-top-2 tw-left-2">
                                        <span className="tw-bg-black tw-bg-opacity-50 tw-text-white tw-px-2 tw-py-1 tw-rounded tw-text-xs">
                                            #{banner.display_order}
                                        </span>
                                    </div>
                                </div>

                                {/* Banner Info */}
                                <div className="tw-p-4">
                                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-1 tw-line-clamp-2">
                                        {banner.title}
                                    </h3>
                                    {banner.subtitle && (
                                        <p className="tw-text-sm tw-text-gray-600 tw-mb-3 tw-line-clamp-2">
                                            {banner.subtitle}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="tw-flex tw-gap-2 tw-flex-wrap tw-justify-end">
                                        {/* ✏️ Edit */}
                                        <Button
                                            onClick={() => handleEdit(banner)}
                                            className="
      tw-flex tw-items-center tw-gap-1 tw-px-3.5 tw-py-1.5 tw-text-sm 
      tw-rounded-lg tw-font-medium
      tw-shadow-sm hover:tw-shadow-md 
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-200 tw-ease-out
      tw-border-0 focus:tw-ring-0
    "
                                            colorClass="
      tw-bg-gradient-to-r tw-from-blue-500 tw-to-indigo-500
      hover:tw-from-blue-600 hover:tw-to-indigo-600
      tw-text-white
      focus:tw-ring-4 focus:tw-ring-blue-300/40
    "
                                        >
                                            <Edit2 className="tw-w-4 tw-h-4" />
                                            แก้ไข
                                        </Button>

                                        {/* 👁 Toggle Active */}
                                        <Button
                                            onClick={() => handleToggleActive(banner)}
                                            className="
      tw-flex tw-items-center tw-gap-1 tw-px-3.5 tw-py-1.5 tw-text-sm 
      tw-rounded-lg tw-font-medium
      tw-shadow-sm hover:tw-shadow-md 
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-200 tw-ease-out
      tw-border-0 focus:tw-ring-0
    "
                                            colorClass={
                                                banner.is_active
                                                    ? "tw-bg-gradient-to-r tw-from-amber-400 tw-to-yellow-500 hover:tw-from-amber-500 hover:tw-to-yellow-600 tw-text-white focus:tw-ring-4 focus:tw-ring-amber-300/40"
                                                    : "tw-bg-gradient-to-r tw-from-emerald-500 tw-to-green-600 hover:tw-from-emerald-600 hover:tw-to-green-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300/40"
                                            }
                                        >
                                            {banner.is_active ? <EyeOff className="tw-w-4 tw-h-4" /> : <Eye className="tw-w-4 tw-h-4" />}
                                            {banner.is_active ? 'ซ่อน' : 'แสดง'}
                                        </Button>

                                        {/* 🗑 Delete */}
                                        <Button
                                            onClick={() => handleDelete(banner)}
                                            className="
      tw-flex tw-items-center tw-gap-1 tw-px-3.5 tw-py-1.5 tw-text-sm 
      tw-rounded-lg tw-font-medium
      tw-shadow-sm hover:tw-shadow-md 
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-200 tw-ease-out
      tw-border-0 focus:tw-ring-0
    "
                                            colorClass="
      tw-bg-gradient-to-r tw-from-rose-500 tw-to-red-600
      hover:tw-from-rose-600 hover:tw-to-red-700
      tw-text-white
      focus:tw-ring-4 focus:tw-ring-rose-300/40
    "
                                        >
                                            <Trash2 className="tw-w-4 tw-h-4" />
                                            ลบ
                                        </Button>
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Create/Edit Modal */}
                {showCreateModal && (
                    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                        <div className="tw-bg-white tw-rounded-xl tw-shadow-xl tw-w-full tw-max-w-2xl tw-max-h-[90vh] tw-overflow-y-auto">
                            <div className="tw-p-6">
                                <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                                    <h2 className="tw-text-2xl tw-font-bold tw-text-gray-900">
                                        {editingBanner ? 'แก้ไข Banner' : 'เพิ่ม Banner ใหม่'}
                                    </h2>
                                </div>

                                <form onSubmit={handleSubmit} className="tw-space-y-6">
                                    {/* Image Upload */}
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                            รูปภาพ Banner <span className="tw-text-red-500">*</span>
                                        </label>

                                        {previewImage && (
                                            <div className="tw-mb-4">
                                                <img
                                                    src={previewImage}
                                                    alt="Preview"
                                                    className="tw-w-full tw-h-48 tw-object-cover tw-rounded-lg tw-border"
                                                />
                                            </div>
                                        )}

                                        <div className="tw-flex tw-items-center tw-gap-4">
                                            <label
                                                htmlFor="banner-upload"
                                                className={`tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-rounded-lg tw-cursor-pointer tw-transition-colors ${isUploading ? 'tw-opacity-50 tw-cursor-not-allowed' : ''
                                                    }`}
                                            >
                                                {isUploading ? (
                                                    <div className="tw-animate-spin tw-w-4 tw-h-4 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></div>
                                                ) : (
                                                    <Upload size={16} />
                                                )}
                                                {isUploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
                                            </label>
                                            <input
                                                id="banner-upload"
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                className="tw-hidden"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                            />
                                            <span className="tw-text-sm tw-text-gray-500">
                                                JPG, PNG, WebP (ไม่เกิน 10MB)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                            ชื่อ Banner <span className="tw-text-red-500">*</span>
                                        </label>
                                        <InputField
                                            type="text"
                                            placeholder="กรอกชื่อ banner"
                                            value={formData.title}
                                            onChange={(value) => setFormData(prev => ({ ...prev, title: value as string }))}
                                            required
                                        />
                                    </div>

                                    {/* Subtitle */}
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                            คำบรรยาย
                                        </label>
                                        <InputField
                                            type="text"
                                            placeholder="กรอกคำบรรยาย (ไม่บังคับ)"
                                            value={formData.subtitle}
                                            onChange={(value) => setFormData(prev => ({ ...prev, subtitle: value as string }))}
                                        />
                                    </div>

                                    {/* Display Order */}
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                            ลำดับการแสดงผล
                                        </label>
                                        <InputField
                                            type="number"
                                            placeholder="1"
                                            value={formData.display_order}
                                            onChange={(value) => setFormData(prev => ({ ...prev, display_order: Number(value) }))}
                                            min={1}
                                        />
                                    </div>

                                    {/* Active Status */}
                                    <div className="tw-flex tw-items-center tw-gap-3">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                            className="tw-w-4 tw-h-4 tw-text-blue-600 tw-bg-gray-100 tw-border-gray-300 tw-rounded focus:tw-ring-blue-500"
                                        />
                                        <label htmlFor="is_active" className="tw-text-sm tw-font-medium tw-text-gray-700">
                                            แสดง banner นี้
                                        </label>
                                    </div>

                                    {/* Actions */}
                                    <div className="tw-flex tw-gap-3 tw-pt-4">
                                        <div className="tw-flex tw-justify-end tw-gap-3 tw-mt-6">
                                            {/* Save Button */}
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting || isUploading || !formData.title || !formData.image_path}
                                                className="
      tw-flex tw-items-center tw-gap-2 
      tw-h-11 tw-px-6 tw-font-semibold
      tw-rounded-xl
      tw-shadow-md hover:tw-shadow-lg
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-300 tw-ease-out
      tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
      disabled:tw-opacity-50 disabled:tw-cursor-not-allowed
    "
                                                colorClass="
      tw-bg-gradient-to-r 
      tw-from-emerald-500 tw-to-green-600 
      hover:tw-from-emerald-600 hover:tw-to-green-700 
      tw-text-white
      focus:tw-ring-4 focus:tw-ring-emerald-300/50
    "
                                            >
                                                {isSubmitting ? (
                                                    <div className="tw-animate-spin tw-w-4 tw-h-4 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></div>
                                                ) : (
                                                    <Save className="tw-w-4 tw-h-4" />
                                                )}
                                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                                            </Button>

                                            {/* Cancel Button */}
                                            {/* <Button
                                                type="button"
                                                onClick={handleCloseModal}
                                                className="
      tw-flex tw-items-center tw-gap-2 
      tw-h-11 tw-px-6 tw-font-semibold 
      tw-rounded-xl 
      tw-shadow-sm hover:tw-shadow-md
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-300 tw-ease-out
      tw-border tw-border-gray-200 tw-bg-white hover:tw-bg-gray-50
      focus:tw-ring-4 focus:tw-ring-gray-200/50
      tw-text-black
    "
                                            >
                                                <X className="tw-w-4 tw-h-4 tw-text-gray-600" />
                                                ยกเลิก
                                            </Button> */}
                                            <Button
                                                className="tw-flex-1 tw-h-12 tw-text-base tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none"
                                                colorClass="tw-bg-gradient-to-r tw-from-red-500 tw-to-red-600 hover:tw-from-red-600 hover:tw-to-red-700 tw-text-white focus:tw-ring-4 focus:tw-ring-red-300"
                                                onClick={handleCloseModal}
                                            >
                                                <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                                    ยกเลิก
                                                </span>
                                            </Button>
                                        </div>

                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default BannerManagementContainer;