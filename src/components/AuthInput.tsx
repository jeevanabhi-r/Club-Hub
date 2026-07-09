import React, { useState } from "react";
import { LucideIcon, Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  icon?: LucideIcon;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  icon: Icon,
  type = "text",
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative w-full">
      {Icon && (
        <Icon
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none z-10"
        />
      )}

      <input
        id={id}
        type={inputType}
        className={`auth-input ${Icon ? "has-left-icon" : ""} ${
          isPassword ? "has-right-icon" : ""
        } ${className}`}
        {...props}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer z-20 focus:outline-none"
        >
          {showPassword ? (
            <EyeOff size={20} className="transition-colors" />
          ) : (
            <Eye size={20} className="transition-colors" />
          )}
        </button>
      )}
    </div>
  );
};
