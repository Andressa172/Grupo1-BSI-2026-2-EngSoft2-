/**
 * ------------------------------------------------------------
 * FAQ SECTION V1 (MARKETING PAGE)
 * ------------------------------------------------------------
 *
 * Displays frequently asked questions using an accordion layout.
 *
 * Features:
 * - Scroll-in animation using Motion
 * - Badge + heading + subheading content block
 * - Interactive accordion for FAQ items
 *
 * Purpose:
 * Answer common questions about Pulse AI to reduce friction
 * and help users understand the product better.
 * ------------------------------------------------------------
 */

"use client";

/* ------------------------------------------------------------
 * UI COMPONENTS
 * ------------------------------------------------------------
 */
import Badge from "@/components/ui/badge";
import Accordion from "@/components/ui/accordion";


import { FAQ_CONTENT } from "@/content/faq";
/* ------------------------------------------------------------
 * ANIMATION
 * ------------------------------------------------------------
 */
import { motion } from "motion/react";

/* ============================================================
 * FAQ SECTION COMPONENT
 * ============================================================ */
export default function FAQS() {
  return (
    <motion.section
      /* --------------------------------------------------------
       * SECTION ANIMATION (ON SCROLL INTO VIEW)
       * --------------------------------------------------------
       * Fades in and moves upward when visible in viewport.
       *
       * once: true → animates only first time
       * amount: 0.3 → triggers when 30% visible
       * -------------------------------------------------------- */
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
      }}
      className="relative overflow-hidden w-full px-12 py-16 border-b border-border-line/20"
    >
      {/* --------------------------------------------------------
       * MAIN CONTAINER
       * --------------------------------------------------------
       * Centers all content and keeps layout constrained.
       * -------------------------------------------------------- */}
      <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-center px-6 text-center">
        
        {/* ------------------------------------------------------
         * BADGE
         * ------------------------------------------------------
         * Displays section label (e.g. "FAQS")
         * ------------------------------------------------------ */}
        <Badge
          icon={FAQ_CONTENT.badge.icon}
          iconSize={15}
        >
         {FAQ_CONTENT.badge.title}
        </Badge>

        {/* ------------------------------------------------------
         * HEADING
         * ------------------------------------------------------ */}
        <h2 className="mt-5 text-3xl text-foreground font-medium leading-snug tracking-tight md:text-5xl">
          {FAQ_CONTENT.heading}
        </h2>

        {/* ------------------------------------------------------
         * SUBHEADING
         * ------------------------------------------------------ */}
        <p className="mt-3 max-w-4xl text-base text-foreground/80">
        { FAQ_CONTENT.subheading }
        </p>

        {/* ------------------------------------------------------
         * ACCORDION
         * ------------------------------------------------------
         * Displays FAQ items in an expandable/collapsible format
         * ------------------------------------------------------ */}
      
<Accordion
  items={FAQ_CONTENT.items}
  allowMultiple={true}
  className="mt-12 w-full max-w-3xl"
/>
      </div>
    </motion.section>
  );
}