import { Fraunces, Atkinson_Hyperlegible_Next } from "next/font/google";
import Navbar from "@/components/layout/navbar";
import Footer  from "@/components/layout/footer";

// Fontes só da landing (o sistema interno continua com a fonte dele):
// - Fraunces: serifa de traço suave e acolhedor, para títulos e números;
// - Atkinson Hyperlegible Next: sem serifa desenhada para leitura fácil, boa para quem tem pouca
//   familiaridade com computador (ERS 2.3: usuários com escolaridade variada).
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-landing-display",
  axes: ["SOFT", "opsz"],
  display: "swap",
});

const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
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
