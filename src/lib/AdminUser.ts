
export interface AdminUser {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
}

export interface AdminFormData {
    username: string;
    password: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}