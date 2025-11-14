export interface UploadResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
}