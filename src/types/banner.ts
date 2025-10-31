export interface Banner {
    id: number;
    title: string;
    subtitle?: string | null;
    image_path: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface BannerFormData {
    title: string;
    subtitle?: string;
    image_path: string;
    is_active: boolean;
    display_order?: number;
}

export interface BannerResponse {
    success: boolean;
    data?: Banner | Banner[];
    message?: string;
    error?: string;
}

export interface BannerUploadResponse {
    success: boolean;
    data?: {
        filename: string;
        url: string;
        size: number;
        type: string;
    };
    message?: string;
    error?: string;
}