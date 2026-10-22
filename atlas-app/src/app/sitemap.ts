/**
 * ------------------------------------------------------------
 * SITEMAP GENERATOR
 * ------------------------------------------------------------
 *
 * Generates the XML sitemap for the application.
 *
 * Responsibilities:
 * - Provides URLs for search engines to crawl
 * - Defines page priority values
 * - Improves SEO discoverability
 *
 * Next.js automatically exposes this file at:
 *
 * /sitemap.xml
 *
 * Documentation:
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 * ------------------------------------------------------------
 */

import { MetadataRoute } from "next";

import { SEO_CONFIG } from "@/content/seo/global";

/* ------------------------------------------------------------
   SITEMAP CONFIGURATION
------------------------------------------------------------ */

/**
 * Returns all publicly accessible pages
 * that should be indexed by search engines.
 *
 * Priority values:
 *
 * 1.0 = Highest priority
 * 0.8 = High priority
 * 0.5 = Medium priority
 * 0.3 = Low priority
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [

    /**
     * Homepage
     * The most important page on the website.
     */
    {
      url: SEO_CONFIG.siteUrl,

      priority: 1,
    },

   
  ];
}
