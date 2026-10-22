'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {  Check } from 'lucide-react';
import  Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PRICING_CONTENT } from '@/content/pricing';
/**
 * ============================================================
 * TYPES & INTERFACES
 * ============================================================
 */
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number | string;
  annualPrice: number | string;
  ctaText: string;
  ctaHref?: string;
  features: string[];
  /** Highlights plan as recommended */
  highlighted?: boolean;
  /** Custom badge text for highlighted plan */
  highlightLabel?: string;
}

/**
 * Animated Price Counter Component
 * Counts up smoothly from 0 to the target number while sliding up into view.
 */
function AnimatedPrice({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest));
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out
    });
    return () => controls.stop();
  }, [count, value]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      if (spanRef.current) {
        spanRef.current.textContent = `R$${latest}`;
      }
    });
    return () => unsubscribe();
  }, [rounded]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      ref={spanRef}
      className="inline-block"
    >
      R${value}
    </motion.span>
  );
}

/**
 * ============================================================
 * DEFAULT PRICING DATA
 * ============================================================
 */
const defaultPlans: PricingPlan[] = PRICING_CONTENT.plans;

/**
 * ============================================================
 * COMPONENT NAME: PricingSection
 * ============================================================
 * PURPOSE:
 * Displays responsive subscription pricing cards with monthly/annual billing 
 * toggle, custom highlighted badges, feature checklists, action buttons, and 
 * animated slide-up price counters for numeric values.
 * 
 * PROPS:
 * - plans (PricingPlan[], optional): Optional array to override default pricing plans.
 * ============================================================
 */
export default function PricingSection({ plans = defaultPlans }: { plans?: PricingPlan[] }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  return (
    <motion.section id="pricing"
        initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
    className="w-full px-12 py-12  border-b border-border-line/20">
      <div className="mx-auto max-w-6xl flex flex-col items-center">
        
        {/* Top Section Badge */}
        <div className="mb-4">
         <Badge icon={PRICING_CONTENT.badge.icon} iconSize={15} className="mb-4">
       {PRICING_CONTENT.badge.title}
      </Badge>
        </div>

        {/* Heading */}
        <h2 className="mb-4 text-center text-4xl font-medium tracking-tight text-foreground">
        {PRICING_CONTENT.heading }
        </h2>

        {/* Subtitle */}
        <p className="mb-10 max-w-2xl text-center text-sm sm:text-base text-foreground/80 leading-relaxed">
          {PRICING_CONTENT.subheading}
        </p>

        {/* Billing Toggle Switch */}
        <div className="mb-14 inline-flex items-center gap-3 rounded-full bg-border-line/10 p-1.5 border border-border-line/5">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            Mensal
          </button>

          <button
            onClick={() => setBillingCycle('annually')}
            className={`rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              billingCycle === 'annually'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-foreground/50 hover:text-foreground/80'
            }`}
          >
            Anual
            <span className="pl-3 text-xs font-medium text-primary">
            ( Economize 20% )
          </span>
          </button>

          
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3 items-stretch">
          {plans.map((plan) => {
            const isHighlighted = plan.highlighted;
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
            const isNumeric = typeof price === 'number';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl bg-background transition-all duration-200 ${
                  isHighlighted
                    ? 'border-2 border-primary shadow-lg'
                    : 'border border-border-line/20 shadow-sm hover:border-border-line/30'
                }`}
              >
                {/* Custom Highlight Top Banner */}
                {isHighlighted && (
                  <div className="w-full bg-primary py-2.5 text-center text-xs font-semibold text-background rounded-t-[14px]">
                    {plan.highlightLabel || 'Most popular'}
                  </div>
                )}

                {/* Main Card Content */}
                <div className="p-8 sm:p-10 flex flex-col flex-1">
                  
                  {/* Plan Name */}
                  <h3 className="text-2xl font-medium text-foreground mb-3">
                    {plan.name}
                  </h3>

                  {/* Plan Description */}
                  <p className="text-xs sm:text-sm text-foreground/50 leading-relaxed mb-6 min-h-10">
                    {plan.description}
                  </p>

                  {/* Price Tag with Animated Counter */}
                  <div className="flex items-baseline gap-1 mb-8 min-h-12">
                    <div className={`${isNumeric ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'} font-medium tracking-tight text-foreground overflow-hidden`}>
                      {isNumeric ? (
                        <AnimatePresence mode="wait">
                          <AnimatedPrice key={`${plan.id}-${price}`} value={price as number} />
                        </AnimatePresence>
                      ) : (
                        <span>{price}</span>
                      )}
                    </div>
                    {isNumeric && (
                      <span className="text-sm text-foreground/50">
                        /mês
                      </span>
                    )}
                  </div>

                  {/* Call to Action Button */}
                  <div className="mb-10">
                    <Button
                      variant={isHighlighted ? 'primary' : 'outline'}
                      size="md"
                      href={plan.ctaHref || '#'}
                      className={`w-full justify-center py-2.5 text-sm font-medium rounded-xl transition-all ${
                        isHighlighted
                          ? 'bg-primary hover:bg-primary/90 text-background shadow-sm'
                          : 'border-border-line hover:bg-muted text-foreground'
                      }`}
                    >
                      {plan.ctaText}
                    </Button>
                  </div>

                  {/* Feature Checklist */}
                  <div className="border-t border-border-line/20 pt-6">
                    <span className="block text-xs font-medium text-foreground mb-4 tracking-wide">
                      Benefícios
                    </span>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-foreground/50">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full 
                          border border-primary bg-primary/20 text-primary shrink-0">
                            <Check className="h-2.5 w-2.5 stroke-3" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </motion.section>
  );
}