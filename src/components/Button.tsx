import { ButtonProps } from "@/lib/ButtonProps";


interface ExtendedButtonProps extends ButtonProps {
  colorClass?: string;
}

export const Button: React.FC<ExtendedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
  colorClass,
}) => {
  const baseStyles =
    "tw-px-6 tw-py-2 tw-rounded-lg tw-font-medium tw-transition-all tw-duration-200 focus:tw-outline-none focus:tw-ring-2";

  const variants: Record<"primary" | "secondary" | "danger", string> = {
    primary: disabled
      ? "tw-bg-gray-300 tw-text-gray-500 tw-cursor-not-allowed"
      : "tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white focus:tw-ring-blue-500",
    secondary: disabled
      ? "tw-bg-gray-300 tw-text-gray-500 tw-cursor-not-allowed"
      : "tw-bg-gray-200 hover:tw-bg-gray-300 tw-text-gray-800 focus:tw-ring-gray-500",
    danger: disabled
      ? "tw-bg-gray-300 tw-text-gray-500 tw-cursor-not-allowed"
      : "tw-bg-red-600 hover:tw-bg-red-700 tw-text-white focus:tw-ring-red-500",
  };

  const styleClass = colorClass
    ? colorClass // ถ้ามีส่งเข้ามา → ใช้แทนเลย
    : variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${styleClass} ${className}`}
    >
      {children}
    </button>
  );
};
