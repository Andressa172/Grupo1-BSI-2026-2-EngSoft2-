/**
 * ------------------------------------------------------------
 * ROBOTS CONFIGURATION
 * ------------------------------------------------------------
 *
 * Generates the robots.txt file for the application.
 *
 * Responsibilities:
 * - Defines which pages search engine crawlers can access
 * - Provides the sitemap location
 * - Controls indexing behavior
 *
 * Next.js automatically exposes this file at:
 *
 * /robots.txt
 *
 * Documentation:
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 * ------------------------------------------------------------
 */

import { SEO_CONFIG } from "@/content/seo/global";

/* ------------------------------------------------------------
   ROBOTS CONFIGURATION
------------------------------------------------------------ */

/**
 * Generates robots.txt rules.
 *
 * Search engine bots supported include:
 * - Googlebot
 * - Bingbot
 * - Yahoo Slurp
 * - DuckDuckBot
 * - Baiduspider
 * - YandexBot
 * - Applebot
 * - Facebook External Hit
 * - LinkedIn Bot
 * - Twitter/X Bot
 *
 * Returning `userAgent: "*"` applies these rules
 * to all crawlers.
 */
export default function robots() {
  return {

    /* --------------------------------------------------------
       CRAWLER RULES
    -------------------------------------------------------- */

    rules: {

      /**
       * Apply rules to every search engine crawler.
       */
      userAgent: "*",

      /**
       * Allow crawling of the entire website.
       */
      allow: "/",

      /**
       * Example exclusions:
       *
       * disallow: [
       *   "/admin",
       *   "/dashboard",
       *   "/api",
       * ]
       */
    },

    /* --------------------------------------------------------
       SITEMAP LOCATION
    -------------------------------------------------------- */

    /**
     * Helps search engines discover all public pages.
     */
    sitemap: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
  };
}