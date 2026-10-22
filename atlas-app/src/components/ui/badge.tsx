/**
 * ============================================================
 * COMPONENT NAME: Badge
 * ============================================================
 * Purpose: A reusable UI badge selectable Lucide icon, 
 * 
 */
"use client";

import React from "react";
import { Dot, LucideIcon } from "lucide-react";

interface BadgeProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  iconSize?: number;
  className?: string;
  fill?: boolean; 
}

export default function Badge({
  children,
  icon: Icon = Dot,
  iconSize = 16,
  fill = false,
  className = "",
}: BadgeProps) {
  // Container styling
  const badgeClasses = `inline-flex items-center gap-2 rounded-full border border-primary bg-primary/30 backdrop-blur-sm text-primary px-2 py-1.5 text-sm font-medium ${className}`.trim();

  // Icon styling
  const iconClasses = `shrink-0 ${fill ? "fill-primary text-primary" : "text-primary"}`;

  return (
    <div className={badgeClasses}>
      <Icon
        size={iconSize}
        className={iconClasses}
        fill={fill ? "currentColor" : "none"}
      />

      <span>{children}</span>
    </div>
  );
}