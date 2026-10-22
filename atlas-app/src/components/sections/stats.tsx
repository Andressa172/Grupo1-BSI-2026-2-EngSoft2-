'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'motion/react';
import { STATS_CONTENT } from '@/content/stats';
/**
 * ============================================================
 * COMPONENT NAME: StatItem
 * ============================================================
 * PURPOSE:
 * Renders an individual stat card with an animated counter effect.
 * Uses Motion's `useInView`, `useMotionValue`, and `animate`
 * to count up smooth numerical values once when scrolled into view.
 * 
 * PROPS:
 * - value (number): Numeric target value to count up to.
 * - prefix (string, optional): Prefix string (e.g., "$").
 * - suffix (string, optional): Suffix string (e.g., "K+", "M+", "%", " hrs").
 * - label (string): Description label displayed beneath the stat number.
 * - showBorder (boolean, optional): Controls vertical divider visibility.
 * ============================================================
 */
interface StatItemProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  showBorder?: boolean;
}

function StatItem({ value, prefix = '', suffix = '', label, showBorder = true }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const count = useMotionValue(0);
  
  // Format counter value as rounded integer
  const rounded = useTransform(count, (latest) => Math.floor(latest));
  const displayValueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, {
        duration: 2,
        ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out curve
      });
      return () => controls.stop();
    }
  }, [isInView, count, value]);

  // Update DOM directly for peak performance during animation
  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      if (displayValueRef.current) {
        displayValueRef.current.textContent = `${prefix}${latest}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [rounded, prefix, suffix]);

  return (
    <div
      ref={ref}
      className={`relative flex flex-col items-center justify-center text-center px-4 py-6 md:py-8 ${
        showBorder ? 'md:border-r border-border-line/20' : ''
      }`}
    >
      {/* Animated Number Counter */}
      <h3 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground tracking-tight mb-3">
        <span ref={displayValueRef}>
          {prefix}0{suffix}
        </span>
      </h3>

      {/* Description Label */}
      <p className="text-xs sm:text-sm text-foreground/50  tracking-normal">
        {label}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * COMPONENT NAME: StatsSection
 * ============================================================
 * PURPOSE:
 * Displays key metrics and statistics in a clean multi-column layout
 * matching the reference screenshot design with subtle dividers,
 * a centered section header, and entrance trigger animations.
 * 
 * PROPS: None (Self-contained metrics dataset).
 * ============================================================
 */
const statsData = STATS_CONTENT.stats;

export default function Stats() {
  return (
    <motion.section 
        initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
    className="w-full py-12 border-b border-foreground/20">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* Top Eyebrow Tag */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl font-medium text-foreground tracking-normal">
            {STATS_CONTENT.heading}
          </h2>
        </div>

        {/* Stats Grid Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-center gap-y-8 gap-x-0"
        >
          {statsData.map((stat, index) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
              showBorder={index !== statsData.length - 1}
            />
          ))}
        </motion.div> 

      </div>
    </motion.section>
  );
}