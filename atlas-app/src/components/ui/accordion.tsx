/**
  * ============================================================
 * COMPONENT NAME: Accordion
 * ============================================================
 *
 * Purpose: A reusable interactive accordion used for FAQs, menus,
 * or collapsible content sections.
 *
 * Features:
 * - Supports multiple open items OR single-open mode
 * - Smooth expand/collapse animations (Framer Motion)
 * - Rotating icon indicator (+ → × effect)
 * - Fully reusable with dynamic data
 * - Lightweight state management using React hooks
 *
 * Common Use Cases:
 * - FAQ sections
 * - Documentation pages
 * - Feature breakdowns
 * - Content toggles
 * ------------------------------------------------------------
 */

"use client";

/* ------------------------------------------------------------
 * REACT
 * ------------------------------------------------------------
 * Core React functionality and state management
 * ------------------------------------------------------------ */
import React, { useState } from "react";

/* ------------------------------------------------------------
 * ANIMATION
 * ------------------------------------------------------------
 * AnimatePresence handles mount/unmount animations,
 * while motion enables smooth transitions.
 * ------------------------------------------------------------ */
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------
 * ICONS
 * ------------------------------------------------------------ */
import { Plus, ChevronDown } from "lucide-react";

/* ------------------------------------------------------------
 * TYPES
 * ------------------------------------------------------------
 * Defines structure for each accordion item.
 * ------------------------------------------------------------ */
export type AccordionItem = {
  id: string | number;
  title: string;
  content: React.ReactNode;
};

/* ------------------------------------------------------------
 * COMPONENT PROPS
 * ------------------------------------------------------------
 * Configuration options for Accordion behavior.
 * ------------------------------------------------------------ */
interface AccordionProps {
  items: AccordionItem[];

  /**
   * If true → multiple items can be open at once
   * If false → only one item can be open at a time
   */
  allowMultiple?: boolean;

  /**
   * Optional custom styling
   */
  className?: string;
}

/* ============================================================
 * ACCORDION COMPONENT
 * ============================================================ */
export default function Accordion({
  items,
  allowMultiple = true,
  className = "",
}: AccordionProps) {
  /**
   * Tracks currently open accordion item IDs
   */
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);

  /**
   * Handles opening/closing of accordion items
   */
  const toggleItem = (id: string | number) => {
    if (allowMultiple) {
      // MULTI-OPEN MODE
      setOpenItems((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      );
    } else {
      // SINGLE-OPEN MODE
      setOpenItems((prev) =>
        prev.includes(id) ? [] : [id]
      );
    }
  };

  return (
    <div
      className={`w-full space-y-2 ${className}`.trim()}
      role="region"
      aria-label="Accordion"
    >
      {/* --------------------------------------------------------
       * RENDER ACCORDION ITEMS
       * -------------------------------------------------------- */}
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);

        return (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className="border-b border-foreground/10 overflow-hidden cursor-pointer select-none transition duration-75"
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            aria-controls={`accordion-content-${item.id}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleItem(item.id);
              }
            }}
          >
            {/* ----------------------------------------------------
             * ACCORDION HEADER
             * ----------------------------------------------------
             * Clickable row containing title + toggle icon
             * ---------------------------------------------------- */}
            <div className="w-full flex items-center justify-between px-4 py-3">
              <span 
                className="text-base text-left font-medium text-foreground"
                id={`accordion-title-${item.id}`}
              >
                {item.title}
              </span>

              {/* --------------------------------------------------
               * TOGGLE ICON
               * --------------------------------------------------
               * Rotates when open (plus becomes X visually)
               * -------------------------------------------------- */}
              <motion.div
                className="text-foreground/50  p-2"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.1, ease: "easeInOut" }}
                aria-hidden="true"
                role="img"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {/* <Plus size={20} />  */}
                <ChevronDown size={20} />
              </motion.div>
            </div>

            {/* ----------------------------------------------------
             * ACCORDION BODY
             * ----------------------------------------------------
             * Expands/collapses with smooth animation
             * ---------------------------------------------------- */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-4 overflow-hidden"
                  id={`accordion-content-${item.id}`}
                  role="region"
                  aria-labelledby={`accordion-title-${item.id}`}
                >
                  <div className="py-3 text-sm text-left text-foreground/80">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}