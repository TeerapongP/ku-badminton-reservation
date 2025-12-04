import { LucideIcon } from "lucide-react";

export type UserRole = 'student' | 'staff' | 'admin' | 'super_admin' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type Gender = 'M' | 'F' | 'I' | 'Other';
export type Membership = 'member' | 'non_member';

export interface UserProfile {
  user_id: number;
  role: UserRole;
  username: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  first_name_en: string;
  last_name_en: string;

  student_id?: string;
  staff_id?: string;
  profile_photo_url?: string;
  status: UserStatus;
  membership: Membership;
  registered_at: string;
  last_login_at?: string;
}

export type OnChange<Field extends keyof UserProfile = keyof UserProfile> =
  (field: Field, value: UserProfile[Field]) => void;

export interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  iconClass?: string;
}
