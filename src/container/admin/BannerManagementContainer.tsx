"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Plus,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    Upload,
    Save,
    X,
    Image as ImageIcon,
    ArrowUp,
    ArrowDown,
    RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import Loading from "@/components/Loading";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Banner, BannerFormData, BannerResponse, BannerUploadResponse } from "@/types/banner";

const BannerManagementContainer: React.FC = () => {
    const { data: session } = useSession();
    const toast = useToast();

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
                throw new Error('Failed to fetch banners');
            }

            const data: BannerResponse = await response.json();

            if (data.success && Array.isArray(data.data)) {
                setBanners(data.data);
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถโหลดข้อมูล banner ได้");
            }
        } catch (error) {
            console.error("Error fetching banners:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูล banner ได้");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

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

    if (isLoading && !isRefreshing) {
        return (
            <Loading
                text="กำลังโหลดข้อมูล banner..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
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
                                disabled={isRefreshing}
                                className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-gray-100 hover:tw-bg-gray-200 tw-text-gray-700 tw-rounded-lg tw-transition-colors"
                            >
                                <RefreshCw size={16} className={isRefreshing ? 'tw-animate-spin' : ''} />
                                รีเฟรช
                            </Button>

                            <Button
                                onClick={handleCreateNew}
                                className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-rounded-lg tw-transition-colors"
                            >
                                <Plus size={16} />
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
                                className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-rounded-lg tw-transition-colors tw-mx-auto"
                            >
                                <Plus size={16} />
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
                                    <div className="tw-flex tw-gap-2 tw-flex-wrap">
                                        <Button
                                            onClick={() => handleEdit(banner)}
                                            className="tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1 tw-text-sm tw-bg-blue-100 hover:tw-bg-blue-200 tw-text-blue-700 tw-rounded tw-transition-colors"
                                        >
                                            <Edit2 size={14} />
                                            แก้ไข
                                        </Button>

                                        <Button
                                            onClick={() => handleToggleActive(banner)}
                                            className={`tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1 tw-text-sm tw-rounded tw-transition-colors ${banner.is_active
                                                    ? 'tw-bg-yellow-100 hover:tw-bg-yellow-200 tw-text-yellow-700'
                                                    : 'tw-bg-green-100 hover:tw-bg-green-200 tw-text-green-700'
                                                }`}
                                        >
                                            {banner.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {banner.is_active ? 'ซ่อน' : 'แสดง'}
                                        </Button>

                                        <Button
                                            onClick={() => handleDelete(banner)}
                                            className="tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1 tw-text-sm tw-bg-red-100 hover:tw-bg-red-200 tw-text-red-700 tw-rounded tw-transition-colors"
                                        >
                                            <Trash2 size={14} />
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
                                    <Button
                                        onClick={handleCloseModal}
                                        className="tw-p-2 tw-text-gray-400 hover:tw-text-gray-600 tw-rounded-lg tw-transition-colors"
                                    >
                                        <X size={20} />
                                    </Button>
                                </div>

                                <form onSubmit={handleSubmit} className="tw-space-y-6">
                                    {/* Image Upload */}
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                            รูปภาพ Banner *
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
                                            ชื่อ Banner *
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
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting || isUploading || !formData.title || !formData.image_path}
                                            className="tw-flex tw-items-center tw-gap-2 tw-px-6 tw-py-2 tw-bg-green-600 hover:tw-bg-green-700 tw-text-white tw-rounded-lg tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <div className="tw-animate-spin tw-w-4 tw-h-4 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></div>
                                            ) : (
                                                <Save size={16} />
                                            )}
                                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="tw-flex tw-items-center tw-gap-2 tw-px-6 tw-py-2 tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-rounded-lg tw-transition-colors"
                                        >
                                            <X size={16} />
                                            ยกเลิก
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BannerManagementContainer;