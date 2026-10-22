'use client';


import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { CTA_CONTENT } from '@/content/cta';
/**
 * ============================================================
 * COMPONENT NAME: CallToActionSection
 * ============================================================
 * PURPOSE:
 * Displays a conversion-focused Call to Action (CTA) section featuring 
 * key headline text, description, dual action buttons, and a preview 
 * Image on the right. 

 * ============================================================
 */



export default function CTA() {
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
    className="relative w-full overflow-hidden text-foreground px-12 py-16">
   

      <div className="relative mx-auto max-w-5xl px-6 bg-primary/10 rounded-md py-12 lg:px-12 lg:py-16">
   
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Content Column */}
          <div className="flex flex-col items-start justify-center lg:col-span-6 z-10">
            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-[1.15] ">
            {CTA_CONTENT.heading}
            </h2>

            {/* Description Subtitle */}
            <p className="text-base  text-foreground/50 leading-relaxed max-w-xl mt-5">
           {CTA_CONTENT.subheding}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-5">
              {/* Primary Button */}
            <Button variant='primary' size='md' href={CTA_CONTENT.cta.primary.href}>
               {CTA_CONTENT.cta.primary.label}
            </Button>

             <Button variant='outline' size='md' href={CTA_CONTENT.cta.secondary.href}>
               {CTA_CONTENT.cta.secondary.label}
            </Button>

            </div>
          </div>

          {/* Right Image/Dashboard Frame Column */}
          <div className="relative lg:col-span-6 flex justify-end items-center">
       

              {/* Dashboard Preview Graphic */}
              <div className="relative aspect-16/10 w-full overflow-hidden pt-2">
                <Image
                  src={CTA_CONTENT.ctaImage.src}
                  alt={CTA_CONTENT.ctaImage.alt}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover object-top rounded-md"
                />
              </div>
            </div>
          </div>

        </div>
    </motion.section>
  );
}