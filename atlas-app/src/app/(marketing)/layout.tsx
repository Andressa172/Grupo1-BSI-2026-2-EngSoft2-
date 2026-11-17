import { Funnel_Display, Funnel_Sans } from "next/font/google";
import Navbar from "@/components/layout/navbar";
import Footer  from "@/components/layout/footer";

// Fontes só da landing (o sistema interno continua com a fonte dele): família Funnel, moderna e
// limpa. Funnel Display nos títulos e Funnel Sans no texto, então as duas combinam por construção.
const display = Funnel_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-landing-display",
  display: "swap",
});

const body = Funnel_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-landing-body",
  display: "swap",
});

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  return (
    <div className={`landing ${display.variable} ${body.variable}`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
