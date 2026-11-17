import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/layout/navbar";
import Footer  from "@/components/layout/footer";

// Fonte só da landing (o sistema interno continua com a fonte dele): Plus Jakarta Sans, moderna e
// limpa, em títulos e texto. A variável é a mesma nos dois usos, então o resto do CSS não muda.
const jakarta = Plus_Jakarta_Sans({
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
    <div className={`landing ${jakarta.variable}`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
