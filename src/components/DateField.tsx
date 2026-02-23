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
        showOnFocus={true}
        hideOnDateTimeSelect={true}
        mask={timeOnly ? "99:99" : undefined}
        pt={{
          root: {
            className: "tw-w-full tw-flex tw-items-stretch tw-border tw-border-gray-300 tw-rounded-md",
          },
          input: {
            className: "tw-flex-1 tw-border-0 tw-outline-none tw-bg-transparent tw-px-3 tw-py-2 tw-text-sm tw-placeholder-slate-400 tw-rounded-l-md",
          },
          dropdownButton: {
            root: {
              className: "tw-bg-cyan-500 tw-border-0 tw-text-white tw-px-3 tw-cursor-pointer hover:tw-bg-cyan-600 tw-flex tw-items-center tw-rounded-r-md",
            },
          },
        }}
      />
    </div>
  );
};