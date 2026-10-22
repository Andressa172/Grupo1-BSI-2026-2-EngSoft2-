import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// export const metadata: Metadata = {
//   title: "LeadFlow - AI-Powered Lead Generation and Management",
//   description: "leadflow.ai is an AI-powered lead generation and management platform that helps businesses streamline their sales processes, prioritize leads, and close more deals efficiently.",
// };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${libreBaskerville.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
