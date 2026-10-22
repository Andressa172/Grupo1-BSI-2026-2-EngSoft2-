'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import  Badge  from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { PROCESS_CONTENT } from '@/content/process';
/**
 * ============================================================
 * COMPONENT NAME: ProcessSection
 * ============================================================
 * PURPOSE:
 * Interactive "How It Works" workflow step tabs section.
 * Allows users to switch between process stages (Bring in Leads, 
 * Let AI Prioritize, Close More Deals) with animated content transitions, 
 * tab state indicators, and preview media containers.
 * 
 * PROPS:
 * Self-contained component using local process dataset (`processSteps`).
 * ============================================================
 */

interface ProcessStep {
  id: string;
  number: string;
  title: string;
  description: string;
  imageSrc: string;
}

const processSteps: ProcessStep[] = PROCESS_CONTENT.steps;

export default function ProcessSection() {
  const [activeTab, setActiveTab] = useState<string>(processSteps[0].id);

  const currentStep = processSteps.find((step) => step.id === activeTab) || processSteps[0];

  return (
    <motion.section id="#process"
    initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
    className="w-full px-12 py-10 border-b border-border-line/20">
      <div className="mx-auto max-w-7xl flex flex-col items-center">
        
        {/* Top Process Badge */}
        <div className="mb-4">
          <Badge icon={PROCESS_CONTENT.badge.icon} iconSize={15} 
          >
            {PROCESS_CONTENT.badge.title}
          </Badge>
        </div>

        {/* Section Heading */}
        <h2 className="mb-4 text-center text-4xl font-medium tracking-tight text-foreground">
          {PROCESS_CONTENT.heading}
        </h2>

        {/* Subtitle Description */}
        <p className="mb-6 max-w-xl text-center text-base text-foreground/50 leading-relaxed">
        {PROCESS_CONTENT.subheading}
        </p>

        {/* Call to Action Button */}
        <div className="mb-14">
          <Button
            variant="primary"
            size="md"
            href={PROCESS_CONTENT.cta.href}
          >
            {PROCESS_CONTENT.cta.label}
          </Button>
        </div>

        {/* Outer Tabbed Card Shell */}
        <div className="w-full rounded-2xl border border-border-line/20 bg-background  overflow-hidden">
          
          {/* Tab Navigation Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-border-line/20 bg-background">
            {PROCESS_CONTENT.steps.map((step) => {
              const isActive = activeTab === step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveTab(step.id)}
                  className={`relative flex items-center justify-center gap-2 py-4 px-6 text-sm font-medium
                     transition-colors cursor-pointer border-b md:border-b-0 md:border-r border-border-line/20 last:border-r-0 ${
                    isActive ? 'bg-background text-foreground' : 'text-foreground/50 hover:text-freground hover:bg-primary/10'
                  }`}
                >
                  <span>{step.number}.</span>
                  <span>{step.title}</span>

                  {/* Active Tab Blue Bottom Indicator Line */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-6 right-6 h-0.75 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Content Panel */}
          <div className="p-8 sm:p-12 min-h-95 lg:min-h-105">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              >
                {/* Left Description Text */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <p className="text-foreground/50 text-base sm:text-lg leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>

                {/* Right Step Preview Media Container */}
                <div className="lg:col-span-7 w-full h-70 sm:h-85 rounded-xl  
                relative overflow-hidden flex items-center justify-center border border-border-line/20">
                  <Image
                    src={currentStep.imageSrc}
                    alt={currentStep.title}
                    width={800}
                    height={500}
                    className="object-cover"
                    priority
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </motion.section>
  );
}