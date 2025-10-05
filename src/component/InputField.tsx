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

    const commonWrapper = `w-full ${className}`;
    const commonLabel = "block text-sm font-medium text-gray-700 mb-2";
    const baseInput =
        `w-full text-sm sm:text-base
     ${error ? "border-red-500" : ""}
     ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}
     ${inputClassName}`;

    return (
        <div className={commonWrapper}>
            {label && (
                <label htmlFor={inputId} className={commonLabel}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* TEXT / EMAIL */}
            {(type === "text" || type === "email") && (
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
                    className="w-full"
                    inputClassName={`${baseInput} w-full !pr-10`}
                    pt={{
                        root: { className: "w-full block" }, // 👈 ให้ wrapper กว้างเต็ม
                        input: { className: "w-full" },
                        showIcon: { className: "flex items-center" },
                        hideIcon: { className: "flex items-center" },
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
                    className="w-full"
                    inputClassName={baseInput}
                    invalid={Boolean(error)}
                    useGrouping={false}
                />
            )}

            {/* Helper & Error */}
            {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
});

InputField.displayName = "InputField";
