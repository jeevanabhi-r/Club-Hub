import React from "react";
import { useLogo } from "../context/LogoContext";
// @ts-ignore
import defaultLogo from "../assets/logo.png";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "sidebar" | "login";
}

export function BrandLogo({ className = "", size = "md" }: BrandLogoProps) {
  const { logoUrl, loading } = useLogo();

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
    sm: "h-6 w-auto max-w-[56px] object-contain rounded",
    md: "h-8 w-auto max-w-[72px] object-contain rounded-md",
    lg: "h-10 w-auto max-w-[90px] object-contain rounded-md",
    xl: "h-12 w-auto max-w-[110px] object-contain rounded-md",
    sidebar: "h-8 w-auto max-w-[80px] object-contain rounded-md",
    login: "h-12 w-auto max-w-[100px] object-contain rounded-lg"
  }[size] || "h-8 w-auto max-w-[72px] object-contain rounded-md";

  // Gap between logo and text
  const gapClass = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-3",
    xl: "gap-4",
    sidebar: "gap-2.5",
    login: "gap-3"
  }[size] || "gap-2";

  if (loading) {
    return (
      <div className={`animate-pulse select-none flex items-center justify-center ${className}`}>
        <span className={`${textClass} text-zinc-600`}>ClubHub</span>
      </div>
    );
  }

  const finalLogoUrl = logoUrl || defaultLogo || "/logo.png";

  return (
    <div className={`select-none flex items-center justify-center ${gapClass} ${className}`}>
      {finalLogoUrl && (
        <img
          src={finalLogoUrl}
          alt="ClubHub Logo"
          className={imgClass}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            const fallback = "/logo.png";
            if (!img.src.endsWith(fallback)) {
              img.src = fallback;
            } else {
              img.style.display = "none";
            }
          }}
        />
      )}
      <span className={`${textClass} bg-gradient-to-r from-[#FF5500] via-[#FF8800] to-[#FFCC00] bg-clip-text text-transparent font-black font-display`}>
        ClubHub
      </span>
    </div>
  );
}


