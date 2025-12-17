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
  timeOnly = false,
  minTime,
  maxTime,
}) => {
  const id = useId();

  // ฟังก์ชันช่วยแปลง String "HH:mm" เป็น Date object เพื่อให้ Calendar ของ PrimeReact เข้าใจ
  const parseTimeToDate = (timeStr: any) => {
    if (!timeStr || typeof timeStr !== 'string') return undefined;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // ใน PrimeReact เมื่อใช้ timeOnly เราจะส่งข้อจำกัดเวลาผ่าน minDate และ maxDate
  // โดยใช้ Date object ที่ระบุเฉพาะชั่วโมงและนาที
  const effectiveMinTime = timeOnly && minTime ? parseTimeToDate(minTime) : minDate;
  const effectiveMaxTime = timeOnly && maxTime ? parseTimeToDate(maxTime) : maxDate;

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
        // ใช้ค่าที่คำนวณแล้วสำหรับจำกัดเวลา
        minDate={effectiveMinTime}
        maxDate={effectiveMaxTime}
        disabled={disabled}
        timeOnly={timeOnly}
        hourFormat="24"
        className="tw-w-full"
        inputClassName="tw-border-0 tw-bg-transparent focus:tw-ring-0" 
      />
    </div>
  );
};