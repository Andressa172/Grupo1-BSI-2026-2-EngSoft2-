/**
 * ============================================================
 * COMPONENT NAME: Logo
 * ============================================================
 * Purpose: A flexible brand logo component supporting an icon/image, 
 * brand text, custom dimensions, and optional link navigation.
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface LogoProps {
  /** Image source path or URL */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Brand text displayed next to the image logo */
  text?: string;
  /** Destination route/link. Defaults to '/' if provided or omitted */
  href?: string;
  /** Explicit logo image width (in pixels) */
  width?: number;
  /** Explicit logo image height (in pixels) */
  height?: number;
  /** Custom wrapper styling */
  className?: string;
  /** Custom styling for the text label */
  textClassName?: string;
  /** Position of the text relative to the image */
  textPosition?: 'right' | 'left';
}

export const Logo: React.FC<LogoProps> = ({
  src,
  alt = 'Company Logo',
  text,
  href = '/',
  width = 36,
  height = 36,
  className = '',
  textClassName = '',
  textPosition = 'right',
}) => {
  // Combine base alignment classes with user-provided styling
  const containerClasses = `inline-flex items-center gap-2.5 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md transition-opacity hover:opacity-90 ${
    textPosition === 'left' ? 'flex-row-reverse' : 'flex-row'
  } ${className}`.trim();

  // Inner logo content (Image + Optional Text)
  const content = (
    <>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        className="object-contain shrink-0"
      />
      {text && (
        <span
          className={`font-semibold text-lg tracking-tight text-foreground ${textClassName}`.trim()}
        >
          {text}
        </span>
      )}
    </>
  );

  // Render wrapped in Next.js Link if href is specified
  if (href) {
    return (
      <Link href={href} className={containerClasses} aria-label={text || alt}>
        {content}
      </Link>
    );
  }

  // Render non-clickable div if href is explicitly set to null/empty
  return <div className={containerClasses}>{content}</div>;
};

export default Logo;