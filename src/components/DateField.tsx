"use client";

import { DateFieldProps } from "@/lib/DateFieldProps";
import { Calendar } from "primereact/calendar";
import { useId } from "react";


export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = "เลือกวันที่",
  required = false,
  showIcon = true,
  minDate,
  maxDate,
  disabled = false,
  className = "",
}) => {
  const id = useId();

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Calendar
        id={id}
        value={value}
        onChange={(e) => onChange(e.value as Date)}
        dateFormat="dd/mm/yy"
        placeholder={placeholder}
        showIcon={showIcon}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
};