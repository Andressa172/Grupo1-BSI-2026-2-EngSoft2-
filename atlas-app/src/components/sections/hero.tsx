'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Rocket } from 'lucide-react';

import Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {HERO_CONTENT } from '@/content/hero';
/**
 * ============================================================
 * COMPONENT NAME: Hero
 * ============================================================
 * PURPOSE:
 * A modern, two-column hero section for SaaS landing pages.
 *
 * Animation:
 * - Left content fades and slides in from the left.
 * - Right dashboard image fades and slides in from the right.
 * - Animations trigger when the section enters the viewport.
 * ============================================================
 */

export default function Hero() {
  return (
    <section className="relative w-full text-foreground py-12 px-8.5 lg:py-20 overflow-hidden border-b border-border-line/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column */}
          <motion.div
            className="lg:col-span-6 flex flex-col items-start space-y-6"
            initial={{ opacity: 0, x: -60,  filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0 , filter: 'blur(0px)',}}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              ease: 'easeInOut',
            }}
          >
            {/* Top Pill Badge */}
            <Badge
              icon={Rocket}
              iconSize={15}
              className="mb-4 text-xs"
            >
              {HERO_CONTENT.badge}
            </Badge>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-foreground leading-[1.15]">
              {HERO_CONTENT.heading}{' '}
              <span className="block text-primary font-libre italic font-normal pt-1">
                {HERO_CONTENT.highlightedHeading}
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-foreground/50 leading-relaxed max-w-lg">
              {HERO_CONTENT.subheading}
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                href={HERO_CONTENT.cta.primary.link}
              >
                {HERO_CONTENT.cta.primary.label}
              </Button>

              <Button
                variant="outline"
                size="md"
                href={HERO_CONTENT.cta.secondary.link}
              >
                {HERO_CONTENT.cta.secondary.label}
              </Button>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            className="lg:col-span-6 w-full h-full min-h-80 sm:min-h-105 lg:min-h-130 rounded-2xl
               relative overflow-hidden flex items-center justify-center border border-border-line/20"
            initial={{ opacity: 0, x: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
          >
            <Image
              src={HERO_CONTENT.heroImage.src}
              alt={HERO_CONTENT.heroImage.alt}
              width={800}
              height={600}
              className="object-cover"
              priority
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}