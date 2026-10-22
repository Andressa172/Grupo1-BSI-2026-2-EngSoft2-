import Navbar from "@/components/layout/navbar";
import Footer  from "@/components/layout/footer";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}