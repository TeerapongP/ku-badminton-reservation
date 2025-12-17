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
  disabled = false,
  className = "",
  timeOnly = false,
}) => {
  const id = useId();

  return (
    <div className={`tw-w-full tw-flex tw-flex-col tw-gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="tw-text-sm tw-font-semibold tw-text-gray-700">
          {label}
          {required && <span className="tw-text-red-500 tw-ml-1">*</span>}
        </label>
      )}

      <Calendar
        id={id}
        value={value}
        onChange={(e) => onChange(e.value as Date)}
        dateFormat="dd/mm/yy"
        placeholder={placeholder}
        showIcon={showIcon}
        disabled={disabled}
        timeOnly={timeOnly}
        hourFormat="24"
        className="tw-w-full"
        inputClassName="tw-border-0 tw-bg-transparent focus:tw-ring-0 tw-placeholder-slate-400"
        
        showOnFocus={true} 
        hideOnDateTimeSelect={true}
        mask={timeOnly ? "99:99" : undefined} 
      />
    </div>
  );
};