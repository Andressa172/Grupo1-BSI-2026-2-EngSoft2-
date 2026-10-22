/**
 * Component Name: Footer
 * Purpose: Responsive website footer with brand details, social links, 
 * navigation columns, a large soft gradient brand watermark matching 
 * the LeadFlow AI logo mark, and copyright legal links.
 * 
 * Props: None (self-contained layout).
 */
'use client';

import Link from 'next/link';
import { Logo } from '../ui/logo';
import { motion } from 'motion/react';
import SocialIcon from '../ui/socialIcon';

// LeadFlow AI custom SVG mark 
const LeadFlowMark = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left tall leaf element */}
    <path d="M58 8C40 8 28 32 18 64C14 77 10 82 8 83C25 83 40 70 50 48C56 35 64 16 58 8Z" />
    {/* Right leaf element */}
    <path d="M92 48C74 48 62 62 52 76C46 84 40 86 38 86C55 86 70 79 80 64C86 55 94 50 92 48Z" />
  </svg>
);


const footerColumns = [
  {
    title: 'Sistema',
    links: [
      { label: 'Funcionalidades', href: '#features' },
      { label: 'Como Ajudar', href: '#pricing' },
      { label: 'Segurança e LGPD', href: '#' },
      { label: 'Acessar Sistema', href: '/auth' },
    ],
  },
  {
    title: 'SOS Criança',
    links: [
      { label: 'Sobre a ONG', href: 'https://soscriancaprudente.org/' },
      { label: 'Como Doar', href: 'https://soscriancaprudente.org/' },
      { label: 'Transparência', href: 'https://soscriancaprudente.org/' },
      { label: 'Contato', href: 'https://soscriancaprudente.org/' },
    ],
  },

];

export default function Footer() {
  return (
    <footer className="w-full bg-background text-foreground px-8.5 pt-16 pb-8 border-t border-border-line/30 font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 60, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.5,
              delay: 0.15,
              ease: 'easeInOut',
            }}
        className="max-w-7xl mx-auto px-6 lg:px-12"
      >
        
        {/* Top Section: Brand Info + Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 pb-12">
          
          {/* Left Column */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            <Logo
              src="/logo.svg"
              alt="Logo ATLAS"
              text="ATLAS"
              href="/"
              className="flex items-center"
            />
            <p className="text-sm text-foreground/50 max-w-sm leading-relaxed">
              Sistema de gestão de estoque, doações, caixa e cardápios do
              SOS Criança - Serviço de Obras Sociais de Presidente Prudente.
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2 text-primary">
             <SocialIcon type="x" color='primary' href="https://twitter.com" openInNewTab />
                <SocialIcon type="facebook" color='primary' href="https://facebook.com" openInNewTab />
                <SocialIcon type="linkedin" color='primary' href="https://linkedin.com" openInNewTab />
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-7 grid grid-cols-2 gap-6 sm:gap-8">
            {footerColumns.map((column) => (
              <div key={column.title} className="flex flex-col space-y-3.5">
                <h3 className="text-sm font-medium text-foreground tracking-tight">
                  {column.title}
                </h3>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Large Gradient Watermark Section matching your logo mark */}
        <div className="relative my-12 py-8 flex items-center justify-center select-none">
          <div className="flex items-center gap-5 sm:gap-8 opacity-90 filter blur-[0.2px]">
            
            {/* Soft Glowing App Icon Box */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-linear-to-tr from-primary via-secondary to-primary/20 flex items-center justify-center p-5 shadow-2xl shadow-primary/20">
              <LeadFlowMark className="w-full h-full text-background" />
            </div>

            {/* Faded Gradient Typography */}
            <span className="text-5xl sm:text-7xl md:text-8xl font-bold bg-linear-to-r from-primary via-secondary to-primary/20 bg-clip-text text-transparent tracking-tight">
              ATLAS
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border-line/30 flex flex-col sm:flex-row items-center justify-between
         text-xs text-foreground/50 gap-4">
          <p>© {new Date().getFullYear()} ATLAS — SOS Criança Presidente Prudente. Todos os direitos reservados.</p>

          <div className="flex items-center space-x-4">
            <Link href="#" className="hover:underline text-primary font-medium">
              Termos de Uso
            </Link>
            <Link href="#" className="hover:underline text-primary font-medium">
              Política de Privacidade
            </Link>
          </div>
        </div>

      </motion.div>
    </footer>
  );
}