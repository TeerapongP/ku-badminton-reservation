import { DropdownOption } from "@/type/DropdownOption";

export interface DropdownFieldProps {
  label?: string;
  name?: string;
  id?: string;
  value?: any;
  onChange?: (value: any) => void;
  options: readonly DropdownOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  dropdownClassName?: string;
  optionLabel?: string; 
}