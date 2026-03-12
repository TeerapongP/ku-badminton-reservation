// ชนิดฝั่งหน้าบ้านที่เราจะใช้แสดงผล
export type CourtView = {
    courtId: number | string;
    facilityId?: number | string | null;
    name: string;
    building?: string | null;
    pricePerHour?: number | null; // หน่วย THB ถ้ามี
    active?: boolean;
};