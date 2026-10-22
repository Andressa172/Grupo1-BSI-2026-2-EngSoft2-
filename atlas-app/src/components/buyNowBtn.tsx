"use client";

import { useState } from "react";
import { ShoppingCart, X, ArrowRight } from "lucide-react";

export default function BuyNowBtn() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-100 flex items-center gap-1.5">
      {/* Glow */}
      <div className="absolute -inset-3 -z-10 rounded-full bg-blue-500/20 blur-2xl" />

    

      {/* Buy Now */}
      <a
        href="https://emmanuelajako406.gumroad.com/l/bxapm"
        className="
          group relative flex h-10 items-center
          overflow-hidden rounded-full
          bg-linear-to-r from-[#2B7FFF] via-[#2d78e9] to-[#2f80fa]
          p-6
          text-white
          shadow-lg shadow-blue-500/30
          transition-all duration-300
          hover:-translate-y-0.5
          hover:shadow-xl hover:shadow-blue-500/40
          active:translate-y-0
        "
      >
        {/* Animated glow */}
        <span
          className="
            absolute inset-0
            bg-linear-to-r
            from-transparent
            via-white/20
            to-transparent
            -translate-x-full
            transition-transform duration-700
            group-hover:translate-x-full
          "
        />

        <span className="relative flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />

          <span className="text-sm font-semibold">
            Get Template Now For Free
          </span>


          <ArrowRight
            className="
              h-3.5 w-3.5
              transition-transform duration-200
              group-hover:translate-x-0.5
            "
          />
        </span>
      </a>
        {/* Close Button */}
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        aria-label="Close purchase button"
        className="
            cursor-pointer
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-full
          border border-slate-200
          bg-white/
          text-slate-500
          shadow-lg shadow-slate-900/10
          backdrop-blur-xl
          transition-all duration-200
          hover:scale-105
          hover:bg-slate-50
          hover:text-slate-900
          active:scale-95
         
        "
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}