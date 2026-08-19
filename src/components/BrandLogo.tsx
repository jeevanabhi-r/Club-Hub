import React from "react";
import { Link } from "react-router-dom";
import { useLogo } from "../context/LogoContext";
import { useAuth } from "../context/AuthContext";
// @ts-ignore
import defaultLogo from "../assets/logo.png";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "sidebar" | "login";
  showText?: boolean;
}

export function BrandLogo({ className = "", size = "md", showText = true }: BrandLogoProps) {
  const { logoUrl } = useLogo();
  const { user } = useAuth();

  // Typography text classes for "ClubHub"
  const textClass = {
    sm: "text-base font-black tracking-tight",
    md: "text-xl font-black tracking-tight",
    lg: "text-2xl font-black tracking-tight",
    xl: "text-3xl font-black tracking-tight",
    sidebar: "text-xl font-black tracking-tight",
    login: "text-[28px] font-black leading-none tracking-tight"
  }[size] || "text-xl font-black tracking-tight";

  // Image size classes when positioned to the left of the text
  const imgClass = {
    sm: "h-6 w-auto max-w-[120px] object-contain rounded shrink-0",
    md: "h-8 w-auto max-w-[150px] object-contain rounded-md shrink-0",
    lg: "h-10 w-auto max-w-[180px] object-contain rounded-md shrink-0",
    xl: "h-12 w-auto max-w-[220px] object-contain rounded-md shrink-0",
    sidebar: "h-8 w-auto max-w-[140px] object-contain rounded-md shrink-0",
    login: "h-12 w-auto max-w-[200px] object-contain rounded-lg shrink-0"
  }[size] || "h-8 w-auto max-w-[150px] object-contain rounded-md shrink-0";

  // Gap between logo and text
  const gapClass = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-3",
    xl: "gap-4",
    sidebar: "gap-2.5",
    login: "gap-3"
  }[size] || "gap-2";

  const resolvedLogoUrl = logoUrl || defaultLogo || "/logo.png";

  const content = (
    <>
      {resolvedLogoUrl && (
        <img
          src={resolvedLogoUrl}
          alt="ClubHub Logo"
          className={imgClass}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.src.includes("logo.png") && !img.src.includes("logo.svg")) {
              img.src = defaultLogo || "/logo.png";
            } else if (!img.src.includes("favicon.png")) {
              img.src = "/favicon.png";
            }
          }}
        />
      )}
      {showText && (
        <span className={`${textClass} bg-gradient-to-r from-[#FF5500] via-[#FF8800] to-[#FFCC00] bg-clip-text text-transparent font-black font-display whitespace-nowrap`}>
          ClubHub
        </span>
      )}
    </>
  );

  if (user) {
    return (
      <Link 
        to="/dashboard" 
        className={`select-none inline-flex items-center justify-center ${gapClass} ${className} hover:opacity-90 transition-opacity cursor-pointer`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`select-none inline-flex items-center justify-center ${gapClass} ${className}`}>
      {content}
    </div>
  );
}


