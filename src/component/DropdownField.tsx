import { DropdownFieldProps } from "@/lib/DropdownFieldProps";
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
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Dropdown
        id={id}
        name={name}
        value={value}
        onChange={(e: DropdownChangeEvent) => onChange?.(e.value)}
        options={options}
        optionLabel={optionLabel}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${dropdownClassName}`}
        pt={{
          root: { className: "w-full" },
          input: { className: "w-full text-sm sm:text-base" },
        }}
      />

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};