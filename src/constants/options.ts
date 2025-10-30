// ---- generic option type ----
export type Option<V extends string = string> = {
  label: string;
  value: V;
  name?: V;
};

// ---- domain types (ผูกกับ enum/ฟิลด์ในระบบ) ----
export type UserType = 'student' | 'staff' | 'guest';
export type LevelOfStudy = 'bachelor' | 'master' | 'doctorate';
export type StaffType = 'gov' | 'university' | 'contractor';
export type PrefixTitle =
  | 'mr' | 'ms' | 'mrs'; // ปล. ถ้าต้องการ “รองศ.” เพิ่ม 'assoc'

// ---- options ----
export const userTypeOptions = [
  { label: 'นิสิต มก.', value: 'student', name: 'student' },
  { label: 'บุคลากร มก.', value: 'staff', name: 'staff' },
  { label: 'บุคคลธรรมดา', value: 'guest', name: 'guest' },
] as const satisfies readonly Option<UserType>[];

export const prefixTitleOptions = [
  { label: 'นาย', value: { en: 'mr', th: 'นาย' } },
  { label: 'นางสาว', value: { en: 'ms', th: 'นางสาว' } },
  { label: 'นาง', value: { en: 'mrs', th: 'นาง' } },
] as const;

export const levelStudyOptions = [
  { label: 'ปริญญาตรี', value: 'bachelor', name: 'bachelor' },
  { label: 'ปริญญาโท', value: 'master', name: 'master' },
  { label: 'ปริญญาเอก', value: 'doctorate', name: 'doctorate' },
] as const satisfies readonly Option<LevelOfStudy>[];

export const staffTypeOptions = [
  { label: 'ข้าราชการ', value: 'gov' },
  { label: 'พนักงานมหาวิทยาลัย', value: 'university' },
  { label: 'ลูกจ้าง', value: 'contractor' },
] as const satisfies readonly Option<StaffType>[];
