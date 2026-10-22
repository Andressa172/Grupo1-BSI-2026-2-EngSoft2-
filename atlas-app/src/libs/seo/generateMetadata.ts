/**
 * ------------------------------------------------------------
 * SEO METADATA GENERATOR
 * ------------------------------------------------------------
 *
 * Utility function for generating page-specific SEO metadata.
 *
 * Responsibilities:
 * - Generates page titles
 * - Generates descriptions
 * - Configures Open Graph metadata
 * - Configures Twitter metadata
 * - Merges global and page-specific keywords
 * - Supports disabling search engine indexing
 *
 * This helper extends the global SEO configuration
 * while allowing individual pages to override values.
 *
 * Example:
 *
 * export const metadata = generateSEO({
 *   title: "Pricing",
 *   description: "Choose a pricing plan.",
 * });
 * ------------------------------------------------------------
 */

import type { Metadata } from "next";

import { SEO_CONFIG } from "@/content/seo/global";

/* ------------------------------------------------------------
   SEO PROPS
------------------------------------------------------------ */

/**
 * Configuration options for generating page metadata.
 */
interface SEOProps {
  /**
   * Page title.
   */
  title?: string;

  /**
   * Page description.
   */
  description?: string;

  /**
   * Open Graph / Twitter preview image.
   */
  image?: string;

  /**
   * Prevents search engines from indexing the page.
   *
   * @default false
   */
  noIndex?: boolean;

  /**
   * Additional page-specific keywords.
   */
  keywords?: string[];
}

/* ------------------------------------------------------------
   SEO GENERATOR
------------------------------------------------------------ */

/**
 * Creates Next.js Metadata using global SEO defaults.
 *
 * If a value is not provided, the global SEO config
 * will be used as a fallback.
 *
 * @returns Metadata
 */
export function generateMetaData({
  title,
  description,
  image,
  noIndex = false,
  keywords = [],
}: SEOProps = {}): Metadata {

  /* ----------------------------------------------------------
     COMPUTED SEO VALUES
  ---------------------------------------------------------- */

  /**
   * Generates the final page title.
   *
   * Example:
   * Pricing → Pricing | Pulse AI
   */
  const seoTitle = title
    ? `${title} | ${SEO_CONFIG.siteName}`
    : SEO_CONFIG.title;

  /**
   * Uses the provided description or falls back
   * to the global site description.
   */
  const seoDescription =
    description ?? SEO_CONFIG.description;

  /**
   * Uses the provided image or falls back
   * to the default Open Graph image.
   */
  const seoImage =
    image ?? SEO_CONFIG.ogImage;

  return {

    /* ------------------------------------------------------
       BASIC METADATA
    ------------------------------------------------------ */

    title: seoTitle,

    description: seoDescription,

    /**
     * Merges global and page-specific keywords.
     */
    keywords: [
      ...SEO_CONFIG.keywords,
      ...keywords,
    ],

    /* ------------------------------------------------------
       SEARCH ENGINE RULES
    ------------------------------------------------------ */

    robots: noIndex
      ? "noindex,nofollow"
      : "index,follow",

    /* ------------------------------------------------------
       OPEN GRAPH METADATA
       Used by:
       - Facebook
       - LinkedIn
       - Discord
       - Slack
    ------------------------------------------------------ */

    openGraph: {

      title: seoTitle,

      description: seoDescription,

      url: SEO_CONFIG.siteUrl,

      siteName: SEO_CONFIG.siteName,

      images: [seoImage],

      locale: SEO_CONFIG.locale,

      type: "website",
    },

    /* ------------------------------------------------------
       TWITTER / X METADATA
    ------------------------------------------------------ */

    twitter: {

      card: "summary_large_image",

      title: seoTitle,

      description: seoDescription,

      images: [seoImage],
    },
  };
}