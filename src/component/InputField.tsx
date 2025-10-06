"use client";

import React, { useId, useState, forwardRef } from "react";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { InputNumber, InputNumberValueChangeEvent } from "primereact/inputnumber";
import { InputFieldProps } from "@/lib/InputFieldProps";

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({
  label,
  name,
  id,
  placeholder = "Enter text...",
  value,
  defaultValue,
  onChange,
  inputMode,
  disabled = false,
  required = false,
  error,
  type = "text",
  className = "",
  inputClassName = "",
  hint,
  min,
  max,
  maxLength,
  step
}, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;

  // ใช้เมื่อ value ไม่ถูกส่งมา (uncontrolled)
  const [internal, setInternal] = useState<string | number | undefined>(defaultValue);

  const isControlled = value !== undefined;
  const val = isControlled ? value : internal;

  const commonWrapper = `tw-w-full ${className}`;
  const commonLabel = "tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2";
  const baseInput =
    `tw-w-full tw-text-sm sm:tw-text-base
     ${error ? "tw-border-red-500" : ""}
     ${disabled ? "tw-bg-gray-100 tw-cursor-not-allowed tw-text-gray-500" : ""}
     ${inputClassName}`;

  return (
    <div className={commonWrapper}>
      {label && (
        <label htmlFor={inputId} className={commonLabel}>
          {label}
          {required && <span className="tw-text-red-500 tw-ml-1">*</span>}
        </label>
      )}

      {/* TEXT / EMAIL / TEL */}
      {(type === "text" || type === "email" || type === "tel") && (
        <InputText
          id={inputId}
          name={name}
          type={type}
          maxLength={maxLength}
          value={val as string | undefined}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value);
            onChange?.(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInput}
          invalid={Boolean(error)}
          inputMode={type === "tel" ? "numeric" : inputMode}
          pattern={type === "tel" ? "[0-9]*" : undefined}
          ref={ref}
        />
      )}

      {/* PASSWORD */}
      {type === "password" && (
        <Password
          id={inputId}
          inputId={inputId}
          name={name}
          value={(val as string) ?? ""}
          onChange={(e) => {
            const newValue = e.target.value;
            if (!isControlled) setInternal(newValue);
            onChange?.(newValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
          toggleMask
          feedback={false}
          className="tw-w-full"
          inputClassName={`${baseInput} tw-w-full !tw-pr-10`}
          pt={{
            root: { className: "tw-w-full tw-block" },           // wrapper กว้างเต็ม
            input: { className: "tw-w-full" },
            showIcon: { className: "tw-flex tw-items-center" },
            hideIcon: { className: "tw-flex tw-items-center" },
          }}
        />
      )}

      {/* NUMBER */}
      {type === "number" && (
        <InputNumber
          id={inputId}
          inputId={inputId}
          name={name}
          value={typeof val === "number" ? val : val ? Number(val) : undefined}
          onValueChange={(e: InputNumberValueChangeEvent) => {
            const newVal = e.value ?? null;
            if (!isControlled) setInternal(newVal ?? undefined);
            onChange?.(newVal ?? 0);
          }}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className="tw-w-full"
          inputClassName={baseInput}
          invalid={Boolean(error)}
          useGrouping={false}
        />
      )}

      {/* Helper & Error */}
      {hint && !error && <p className="tw-mt-1 tw-text-xs tw-text-gray-500">{hint}</p>}
      {error && <p className="tw-mt-1 tw-text-sm tw-text-red-500">{error}</p>}
    </div>
  );
});

InputField.displayName = "InputField";
