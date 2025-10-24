import { DropdownFieldProps } from "@/lib/DropdownFieldProps";
import { DropdownOption } from "@/types/DropdownOption";
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';

export const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  name,
  id,
  value,
  onChange,
  options,
  placeholder = "เลือกข้อมูล...",
  required = false,
  disabled = false,
  error,
  className = "",
  dropdownClassName = "",
  optionLabel = "label",
}) => {
  return (
    <div className={`tw-w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2"
        >
          {label}
          {required && <span className="tw-text-red-500 tw-ml-1">*</span>}
        </label>
      )}

      <Dropdown
        id={id}
        name={name}
        value={value}
        onChange={(e: DropdownChangeEvent) => onChange?.(e.value)}
        options={options as any}
        optionLabel={optionLabel}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${dropdownClassName}`}
        pt={{
          root: { className: "tw-w-full" },
          input: { className: "tw-w-full tw-text-sm sm:tw-text-base" },
        }}
      />

      {error && <p className="tw-mt-1 tw-text-sm tw-text-red-500">{error}</p>}
    </div>
  );
};