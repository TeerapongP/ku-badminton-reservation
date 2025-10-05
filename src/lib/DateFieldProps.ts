export interface DateFieldProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showIcon?:boolean;
  disabled?: boolean;
  className?: string;
}