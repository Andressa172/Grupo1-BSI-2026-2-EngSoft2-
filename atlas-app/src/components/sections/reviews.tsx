'use client';

import  { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Badge from "@/components/ui/badge";
import { REVIEWS_CONTENT } from "@/content/reviews";
/**
 * ============================================================
 * COMPONENT NAME: Reviews
 * ============================================================
 * PURPOSE:
 * Interactive customer review showcase component featuring animated 
 * image zoom/fade transitions, author info slide-ups, and staggered 
 * line-by-line quote reveals using Framer Motion.
 * 
 * PROPS:
 * Self-contained review carousel dataset.
 * ============================================================
 */

interface Review {
  id: number;
  name: string;
  role: string;
  company: string;
  quote: string;
  image: string;
}

const reviewsData: Review[] = REVIEWS_CONTENT.items;

// Motion Variants for Quote Line-by-Line Stagger (Sliding down)
const quoteContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const quoteLineVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1], // Custom smooth ease
    },
  },
};

export default function Reviews() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviewsData.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + reviewsData.length) % reviewsData.length);
  };

  const currentReview = reviewsData[currentIndex];

  // Split quote into sentence chunks to animate line-by-line slide down
  const quoteLines = currentReview.quote
    .match(/[^.!?]+[.!?]+/g)
    ?.map((line) => line.trim()) || [currentReview.quote];

  return (
    <motion.section id="reviews"
    initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
    className="w-full px-12 py-12 flex flex-col justify-center items-center border-b border-border-line/20">
      <Badge icon={REVIEWS_CONTENT.badge.icon} iconSize={15} className="mb-4">
        {REVIEWS_CONTENT.badge.title}
      </Badge>

      {/* Heading */}
      <h2 className="text-3xl md:text-4xl tracking-tight mb-12 font-medium text-center text-foreground">
        {REVIEWS_CONTENT.heading}
      </h2>

      {/* Main Review Card Wrapper */}
      <div className="w-full max-w-5xl border border-border-line/20 grid grid-cols-1 md:grid-cols-12 rounded-md overflow-hidden bg-background">
        
        {/* Left Section: Author Image with Smooth Fade & Scale Expand */}
        <div className="md:col-span-4 h-80 md:h-auto relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{
                duration: 0.5,
                ease: [0.25, 1, 0.5, 1], // Smooth expand ease
              }}
              className="w-full h-full object-cover object-center absolute inset-0"
            >
                <Image
              key={currentReview.id}
                  src={currentReview.image}
                  alt={currentReview.name}
                  fill
                  className="object-cover object-center"
                />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Center Section: Metadata & Navigation */}
        <div className="md:col-span-3 p-6 md:p-8 border-b md:border-b-0 md:border-r border-border-line/20 flex flex-col justify-between space-y-8">
          <div>
            {/* Pagination Counter */}
            <span className="text-primary text-xs tracking-widest font-mono block mb-6">
              ({String(currentIndex + 1).padStart(2, "0")} / {String(reviewsData.length).padStart(2, "0")})
            </span>

            {/* Author Info with Slide-Up Motion */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentReview.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="text-2xl font-medium text-foreground mb-1">
                  {currentReview.name}
                </h3>
                <p className="text-sm text-foreground/50 tracking-wide">
                  {currentReview.role}, <span className="text-foreground/90">{currentReview.company}</span>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-2 pt-4">
            <Button
              iconLeft={<ArrowLeft />}
              onClick={handlePrev}
              variant="outline"
              size="sm"
              aria-label="Previous review"
            />
            <Button
              iconLeft={<ArrowRight />}
              onClick={handleNext}
              variant="outline"
              size="sm"
              aria-label="Next review"
            />
          </div>
        </div>

        {/* Right Section: Quote with Sequenced Slide-Down Lines */}
        <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-start space-y-6">
          {/* Quote Symbol */}
          <div className="text-primary/80">
            <Quote className="size-6 rotate-180 fill-current" />
          </div>

          {/* Staggered Line-by-Line Slide Down Quote */}
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={currentReview.id}
              variants={quoteContainerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
              className="text-2xl md:text-3xl text-foreground/90 leading-snug font-normal tracking-tight space-y-2"
            >
              {quoteLines.map((line, idx) => (
                <motion.span
                  key={idx}
                  variants={quoteLineVariants}
                  className="block"
                >
                  "{line}"
                </motion.span>
              ))}
            </motion.blockquote>
          </AnimatePresence>
        </div>

      </div>
    </motion.section>
  );
}