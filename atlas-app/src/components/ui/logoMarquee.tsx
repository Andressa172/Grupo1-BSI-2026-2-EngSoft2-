/**
   * ============================================================
 * COMPONENT NAME: Logo Marquee
 * ============================================================
 * PurPose:  A horizontally scrolling (marquee-style) logo slider used for
 * showcasing trusted brands, partners, or clients.
 *
 * Features:
 * - Infinite seamless scrolling animation (Motion)
 * - Direction control (left or right)
 * - Hover interactions (pause or slow down)
 * - Auto width calculation for smooth looping
 * - Duplicate content strategy for infinite effect
 * - Viewport detection (only animates when visible)
 * - Optional fade overlays on edges
 *
 * Built with:
 * - Next.js Image optimization
 * - React hooks
 * ------------------------------------------------------------
 */
import { useRef, useEffect, useState } from "react";
import Image from "next/image";

/* =========================
   TYPE DEFINITIONS
========================= */

type ActionOnHover = "slow" | "pause" | "none";
type ScrollDirection = "left" | "right";

interface LogoItem {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface LogoMarqueeProps {
  heading?: string;
  logos: LogoItem[];
  actionOnHover?: ActionOnHover;
  scrollDirection?: ScrollDirection;
  scrollSpeed?: number;
  showFadeOverlays?: boolean; // New prop to control fade overlays
}

/* =========================
   COMPONENT
========================= */

const LogoMarquee: React.FC<LogoMarqueeProps> = ({
  heading,
  logos,
  actionOnHover = "pause",
  scrollDirection = "left",
  scrollSpeed = 20,
  showFadeOverlays = true, // Default to true for backward compatibility
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Duplicate logos 4 times for seamless looping
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const getAnimationStyles = () => {
    const direction = scrollDirection === "left" ? "reverse" : "normal";

    return {
      animation: isInView
        ? `marquee-scroll ${scrollSpeed}s linear infinite ${direction}`
        : "none",
    };
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden py-8 relative">
      <style jsx>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-25%);
          }
        }

        .marquee-content {
          display: flex;
          gap: 3rem;
          align-items: center;
          white-space: nowrap;
          width: max-content;
        }

        .marquee-content.paused {
          animation-play-state: paused !important;
        }

        .marquee-content.slow {
          animation-duration: ${scrollSpeed * 3}s !important;
        }
      `}</style>

      {heading && (
        <h2 className="text-left text-sm  mb-8 text-foreground/50 tracking-tight">
          {heading}
        </h2>
      )}

      <div className="relative w-full">
        {/* Left fade overlay - conditionally rendered */}
        {showFadeOverlays && (
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-linear-to-r from-background/20 to-transparent" />
        )}

        {/* Right fade overlay - conditionally rendered */}
        {showFadeOverlays && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-linear-to-l from-background/20 to-transparent" />
        )}

        <div
          className={`marquee-content ${!isInView ? "paused" : ""}`}
          style={getAnimationStyles()}
          onMouseEnter={(e) => {
            if (actionOnHover === "pause") {
              e.currentTarget.classList.add("paused");
            } else if (actionOnHover === "slow") {
              e.currentTarget.classList.add("slow");
            }
          }}
          onMouseLeave={(e) => {
            if (actionOnHover === "pause") {
              e.currentTarget.classList.remove("paused");
            } else if (actionOnHover === "slow") {
              e.currentTarget.classList.remove("slow");
            }
          }}
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.alt}-${index}`}
              className="shrink-0 grayscale hover:grayscale-0 transition-all duration-300"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={logo.width || 100}
                height={logo.height || 50}
                sizes="(max-width:768px) 100vw, 33vw"
                className="object-contain"
                priority={index < logos.length}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoMarquee;