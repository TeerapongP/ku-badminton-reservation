export interface InputFieldProps {
  label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  inputMode?: "text" | "email" | "tel" | "search" | "url" | "numeric" | "none" | "decimal";
  type?: "text" | "email" | "password" | "number" | "tel";
  className?: string;
  inputClassName?: string;   // ใช้ตกแต่งตัว input เพิ่มเติม
  hint?: string;             // helper text ใต้ช่อง
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
}