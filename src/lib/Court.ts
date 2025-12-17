export interface Court {
    court_id: string;
    court_code: string;
    name: string;
    name_th?: string;
    court_type?: string;
    is_active: boolean;
    image_path: string;
    building: string;
    is_blackout?: boolean;
    is_booked?: boolean; // เพิ่มสถานะการจอง
    blackout_info?: {
        blackout_id: string;
        start_datetime: string;
        end_datetime: string;
        reason: string | null;
    } | null;
}