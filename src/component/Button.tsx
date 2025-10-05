import { ButtonProps } from "@/lib/ButtonProps";

interface ExtendedButtonProps extends ButtonProps {
  colorClass?: string; // class สำหรับกำหนดสีเอง
}

export const Button: React.FC<ExtendedButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
  colorClass
}) => {
  const baseStyles =
    "px-6 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2";

  const variants: Record<"primary" | "secondary" | "danger", string> = {
    primary: disabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: disabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
    danger: disabled
      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
      : "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
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
