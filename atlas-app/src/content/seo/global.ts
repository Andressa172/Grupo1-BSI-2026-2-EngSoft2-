/**
 * ------------------------------------------------------------
 * SEO GLOBAL CONFIGURATION
 * ------------------------------------------------------------
 * Central configuration object for SEO metadata used across
 * the application (Next.js App Router / Pages Router compatible).
 *
 * This controls how your site appears in:
 * - Search engine results (Google, Bing, etc.)
 * - Social media previews (Open Graph, Twitter Cards)
 * - Browser metadata (titles, descriptions)
 * ------------------------------------------------------------
 */

export const SEO_CONFIG = {
  /**
   * The name of your site or brand.
   * Used in titles, metadata, and Open Graph branding.
   */
  siteName: "LeadFlow AI",

  /**
   * Base URL of the site.
   * Uses environment variable in production and falls back
   * to localhost for local development.
   */
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",

  /**
   * Default SEO title for the site.
   * Appears in browser tabs and search results.
   */
  title: "LeadFlow AI",

  /**
   * Meta description shown in search results.
   * Helps improve click-through rate (CTR).
   */
  description:
    "LeadFlow AI - A Premium Next.js SAAS Landing Page Template - Built by launchpadnext",

  /**
   * Default Open Graph image used when sharing links.
   * Recommended size: 1200x630px
   */
  ogImage: "/default.png",

  /**
   * Twitter handle for Twitter Card metadata.
   */
  twitterHandle: "@launchpadnext",

  /**
   * SEO keywords (less important for modern Google SEO,
   * but still useful for internal indexing or other engines).
   */
  keywords: [
    "Next.js",
    "SaaS",
    "AI",
    "Boilerplate",
    "Templates",
  ],

  /**
   * Author of the project.
   */
  author: "launchpadnext",

  /**
   * Content creator or brand owner.
   */
  creator: "launchpadnext",

  /**
   * Twitter username (duplicate of twitterHandle for flexibility).
   */
  twitter: "@launchpadnext",

  /**
   * Default locale for metadata.
   * Used in Open Graph and international SEO targeting.
   */
  locale: "en_US",
};