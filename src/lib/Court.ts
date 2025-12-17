export interface Court {
    court_id: string;
    court_code: string;
    name: string;
    name_th?: string;
    court_type?: string;
    is_active: boolean;
    image_path: string;
    building: string;
}