

import Hero from '@/components/sections/hero';
import Stats from '@/components/sections/stats';
import Features from '@/components/sections/features';
import Process from '@/components/sections/process';
import Reviews from '@/components/sections/reviews';
import Pricing from '@/components/sections/pricing';
import CTA from '@/components/sections/cta';
import FAQS from '@/components/sections/faq';

/* ------------------------------------------------------------
 * SEO METADATA
 * ------------------------------------------------------------
 */
import { generateMetaData } from "@/libs/seo/generateMetadata";

export const metadata =
  generateMetaData({
  title: "ATLAS - Sistema de Gestão do SOS Criança",
  description: "ATLAS é o sistema de gestão de estoque, doações, caixa e cardápios do SOS Criança - Serviço de Obras Sociais de Presidente Prudente.",
  });


export default function HomePage() {
  return (
  <div className="bg-background relative min-h-screen before:fixed 
  before:inset-y-0 before:left-8 before:w-px before:bg-border-line/20 after:fixed after:inset-y-0
   after:right-8 after:w-px after:bg-border-line/20">
  {/* Page content */}
<Hero />
<Stats />
<Features />
<Process />
<Reviews />
<Pricing />
<FAQS />
<CTA />
</div>
  );
}
