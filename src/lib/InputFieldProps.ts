 export interface InputFieldProps {
  label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  type?: "text" | "email" | "password" | "number";
  className?: string;
  inputClassName?: string;   // ใช้ตกแต่งตัว input เพิ่มเติม
  hint?: string;             // helper text ใต้ช่อง
  min?: number;
  max?: number;
  step?: number;
  maxLength?:number;
}