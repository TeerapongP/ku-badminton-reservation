"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { InputText } from "primereact/inputtext";
import { SearchInputProps } from "@/lib/SearchInputProps";

export default function SearchInput({
    value,
    onChange,
    placeholder = "ค้นหา...",
    className = "",
    inputClassName = "",
    disabled = false,
    onSubmit,
    clearable = true,
}: SearchInputProps) {
    return (
        <div className={`tw-relative tw-group ${className}`}>
            {/* Gradient overlay (hover effect) */}
            <div className="tw-absolute tw-inset-0 tw-bg-gradient-to-r tw-from-gray-400 tw-to-gray-300 tw-rounded-xl tw-opacity-0 group-hover:tw-opacity-10 tw-transition-opacity tw-duration-300 tw-pointer-events-none" />

            {/* Search Icon */}
            <Search
                className={[
                    "tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2",
                    "tw-w-5 tw-h-5 tw-transition-all tw-duration-200",
                    disabled
                        ? "tw-text-gray-300"
                        : "tw-text-gray-400 group-hover:tw-text-gray-500",
                ].join(" ")}
            />

            {/* Input Field (PrimeReact InputText) */}
            <InputText
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmit?.();
                }}
                placeholder={placeholder}
                disabled={disabled}
                aria-label="ค้นหา"
                className={[
                    "tw-w-full tw-text-sm sm:tw-text-base tw-bg-white tw-rounded-xl tw-pl-12 tw-pr-11 tw-py-3",
                    "tw-border tw-border-gray-300 tw-shadow-sm tw-placeholder-gray-400 tw-transition-all tw-duration-200",
                    disabled
                        ? "tw-bg-gray-50 tw-cursor-not-allowed tw-text-gray-400"
                        : "hover:tw-border-gray-400 active:tw-border-gray-400 focus:tw-border-gray-400 focus:tw-ring-0 focus:tw-outline-none",
                    inputClassName,
                ].join(" ")}
            />

            {/* Clear Button */}
            {clearable && !disabled && value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    aria-label="ล้างข้อความค้นหา"
                    className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-flex tw-items-center tw-justify-center tw-w-7 tw-h-7 tw-rounded-lg tw-text-gray-400 hover:tw-text-gray-600 hover:tw-bg-gray-100 tw-transition-colors"
                >
                    <X className="tw-w-4 tw-h-4" />
                </button>
            )}
        </div>
    );
}
