'use client';

import React from 'react';

import { motion } from 'motion/react';


import Badge from '@/components/ui/badge';
import { FEATURESCONTENT } from '@/content/features';
/**
 * ============================================================
 * COMPONENT NAME: BenefitsSection
 * ============================================================
 * PURPOSE:
 * Displays key platform features and benefits in a 3-column
 * card grid with staggered entrance animations.
 * ============================================================
 */

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

export default function Features() {
  return (
    <section id="features" className="w-full px-12 py-16 border-b border-border-line/20">
      <div className="mx-auto max-w-7xl">

<motion.div
initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}>
                {/* Top Feature Badge */}
        <div className="mb-6">
          <Badge icon={FEATURESCONTENT.badge.icon} iconSize={15}>
            {FEATURESCONTENT.badge.title}
          </Badge>
        </div>

    {/* Section Heading */}
        <h2 className="mb-4 text-4xl font-medium tracking-tight text-foreground">
          {FEATURESCONTENT.heading}
        </h2>

        {/* Section Subtitle */}
        <p className="mb-12 max-w-2xl text-base text-foreground/50 leading-relaxed">
          {FEATURESCONTENT.subheading}
        </p>
</motion.div>
    

        {/* 3-Column Benefits Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURESCONTENT.items.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={index}
                className="flex flex-col justify-between rounded-md border border-border-line/20
                bg-background p-8 py-8 transition-all duration-200 hover:shadow-sm"
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(8px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Feature Icon Container */}
                <div
                  className="mb-20 flex size-14 items-center justify-center rounded-md
                  bg-primary text-background shadow-sm"
                >
                  <Icon className="size-8" />
                </div>

                {/* Card Text Content */}
                <div>
                  <h3 className="mb-3 text-xl font-medium text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-foreground/50">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}