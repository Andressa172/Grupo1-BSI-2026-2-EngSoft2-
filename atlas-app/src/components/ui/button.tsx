/**
 * ============================================================
 * COMPONENT NAME: button
 * ============================================================
 * Purpose: A reusable UI button component that supports variants, sizes, 
 * loading states (with custom wait cursor/opacity), optional icons, and 
 * rendering as either an HTML button or a Next.js Link.
 */

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  href?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  isIconOnly?: boolean;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  href,
  iconLeft,
  iconRight,
  isIconOnly = false,
  className = '',
  ...props
}) => {
  // Base styles: added `cursor-wait` and `opacity-60` specifically when isLoading is true
  const baseStyles = `
    inline-flex items-center justify-center font-medium transition-all duration-150
    focus:outline-none  rounded-md
    ${isLoading ? 'cursor-wait opacity-60 pointer-events-none' : 'cursor-pointer'}
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
  `;

  // Variant styles
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-background hover:bg-primary/90 focus:ring-primary shadow-sm',
    secondary:
      'bg-secondary text-foreground hover:bg-secondary/90 focus:ring-secondary shadow-sm',
    outline:
      'border border-primary/40 text-foreground bg-transparent hover:bg-primary/5 focus:ring-primary',
    ghost:
      'text-foreground hover:bg-primary/5 focus:ring-primary bg-transparent',
    danger:
      'bg-red-600 text-background hover:bg-red-700 focus:ring-red-500 shadow-sm',
  };

  // Standard sizes vs Icon-Only sizes
  const sizes: Record<ButtonSize, string> = isIconOnly
    ? {
        sm: 'p-1.5 text-sm',
        md: 'p-2 text-base',
        lg: 'p-3 text-lg',
      }
    : {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-4 py-2 text-base gap-2',
        lg: 'px-6 py-3 text-lg gap-2.5',
      };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  // Content structure
  const content = (
    <>
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>
      )}

      {!isIconOnly && children && <span>{children}</span>}

      {!isLoading && iconRight && (
        <span className="inline-flex shrink-0">{iconRight}</span>
      )}
    </>
  );

  // Render as Next.js Link (prevents click events if loading or disabled)
  if (href && !isLoading && !disabled) {
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  // Render standard HTML Button
  return (
    <button
      className={combinedClasses}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};