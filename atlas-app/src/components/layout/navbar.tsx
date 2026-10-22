'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Mail, BookOpen, CircleQuestionMark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '../ui/logo';

// ------------------------------------------------------------
// DROPDOWN ITEM INTERFACE
// ------------------------------------------------------------

export interface DropdownItem {
  name: string;
  href: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

// ------------------------------------------------------------
// NAV LINK INTERFACE
// ------------------------------------------------------------

export interface NavLink {
  name: string;
  href?: string;
  dropdownItems?: DropdownItem[];
}

// ------------------------------------------------------------
// NAVIGATION DATA
// ------------------------------------------------------------

const navLinks: NavLink[] = [
  { name: 'Funcionalidades', href: '/#features' },
  { name: 'Como Ajudar', href: '/#pricing' },
  {
    name: 'Institucional',
    dropdownItems: [
      {
        name: 'Sobre o SOS Criança',
        href: 'https://soscriancaprudente.org/',
        icon: <CircleQuestionMark size={18} />,
        iconPosition: 'left',
      },
      {
        name: 'O Sistema ATLAS',
        href: '#features',
        icon: <Sparkles size={18} />,
        iconPosition: 'left',
      },
      {
        name: 'Contato',
        href: 'https://soscriancaprudente.org/',
        icon: <Mail size={18} />,
        iconPosition: 'left',
      },
      {
        name: 'Documentação',
        href: '#docs',
        icon: <BookOpen size={18} />,
        iconPosition: 'right',
      },
    ],
  },
  { name: 'Depoimentos', href: '#reviews' },
];

// ------------------------------------------------------------
// NAVBAR COMPONENT
// ------------------------------------------------------------

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(
    null
  );

  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <header className="sticky bg-background  top-0 z-100 w-full border-b border-border-line/30 px-8.5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Logo
          src="/logo.svg"
          alt="Logo ATLAS"
          text="ATLAS"
          className="flex items-center"
        />

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const hasDropdown =
              link.dropdownItems && link.dropdownItems.length > 0;

            if (!hasDropdown) {
              return (
                <Link
                  key={link.name}
                  href={link.href || '#'}
                  className="text-sm  text-foreground/70 transition-colors hover:text-primary"
                >
                  {link.name}
                </Link>
              );
            }

            return (
              <div
                key={link.name}
                className="relative"
                onMouseEnter={() => setActiveDropdown(link.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {/* Desktop Dropdown Trigger */}
                <button
                  className="flex cursor-pointer items-center gap-1.5 py-2 text-sm text-foreground/70 transition-colors hover:text-primary focus:outline-none"
                  aria-expanded={activeDropdown === link.name}
                >
                  <span>{link.name}</span>

                  <ChevronDown
                    size={16}
                    className={`transition-all duration-200 ${
                      activeDropdown === link.name
                        ? 'rotate-180 text-primary'
                        : 'text-foreground/80'
                    }`}
                  />
                </button>

                {/* Desktop Dropdown Submenu */}
                <AnimatePresence>
                  {activeDropdown === link.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 top-full z-50 w-50 pt-2"
                    >
                      <div className="rounded-xl border border-foreground/10 bg-background p-2 shadow-sm ring-1 ring-foreground/5">
                        {link.dropdownItems?.map((item) => {
                          const isIconRight = item.iconPosition === 'right';

                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className="group flex items-center justify-between gap-3 
                              rounded-lg p-2.5 text-foreground/70 transition-colors hover:bg-primary/5 hover:text-primary"
                            >
                              <div
                                className={`flex w-full items-center gap-3 ${
                                  isIconRight
                                    ? 'justify-between'
                                    : 'justify-start'
                                }`}
                              >
                                {/* Left Icon */}
                                {!isIconRight && item.icon && (
                                  <span className="shrink-0 text-foreground/70 transition-colors duration-200 group-hover:text-primary">
                                    {item.icon}
                                  </span>
                                )}

                                {/* Link Label */}
                                <span className="text-sm font-medium leading-none">
                                  {item.name}
                                </span>

                                {/* Right Icon */}
                                {isIconRight && item.icon && (
                                  <span className="shrink-0 text-foreground/80 transition-colors duration-200 group-hover:text-primary">
                                    {item.icon}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Desktop Call to Action Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" size="md" href="/auth">
            Entrar
          </Button>

          <Button variant="primary" size="md" href="/auth">
            Acessar Sistema
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMenu}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center 
          rounded-lg p-2 text-foreground hover:bg-foreground/5 focus:outline-none md:hidden"
          aria-label="Toggle Navigation Menu"
          aria-expanded={isOpen}
        >
          <div className="flex h-4 w-5 flex-col justify-between">
            <motion.span
              animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-0.5 w-full origin-center rounded-full bg-gray-800"
            />

            <motion.span
              animate={isOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="h-0.5 w-full rounded-full bg-gray-800"
            />

            <motion.span
              animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-0.5 w-full origin-center rounded-full bg-gray-800"
            />
          </div>
        </button>
      </div>

      {/* Mobile Accordion Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-border-line/30 px-2 md:hidden"
          >
            <div className="flex flex-col space-y-3 px-4 py-6 sm:px-6">
              {navLinks.map((link) => {
                const hasDropdown =
                  link.dropdownItems && link.dropdownItems.length > 0;

                if (!hasDropdown) {
                  return (
                    <Link
                      key={link.name}
                      href={link.href || '#'}
                      onClick={() => setIsOpen(false)}
                      className="text-base font-medium text-foreground/80 transition-colors hover:text-primary"
                    >
                      {link.name}
                    </Link>
                  );
                }

                const isMobileSubOpen = mobileDropdownOpen === link.name;

                return (
                  <div key={link.name} className="flex flex-col">
                    {/* Mobile Dropdown Trigger */}
                    <button
                      onClick={() =>
                        setMobileDropdownOpen(
                          isMobileSubOpen ? null : link.name
                        )
                      }
                      className="flex w-full items-center justify-between py-1 text-base font-medium text-foreground/80 transition-colors hover:text-primary"
                      aria-expanded={isMobileSubOpen}
                    >
                      <span>{link.name}</span>

                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${
                          isMobileSubOpen
                            ? 'rotate-180 text-primary'
                            : 'text-foreground/80'
                        }`}
                      />
                    </button>

                    {/* Mobile Dropdown Items */}
                    <AnimatePresence>
                      {isMobileSubOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col space-y-2 overflow-hidden pl-3 pt-2"
                        >
                          {link.dropdownItems?.map((item) => {
                            const isIconRight = item.iconPosition === 'right';

                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className="group flex items-center justify-between py-1 text-sm font-medium text-foreground/60 transition-colors hover:text-primary"
                              >
                                <span className="flex items-center gap-2">
                                  {!isIconRight && item.icon && (
                                    <span className="text-foreground/60 transition-colors duration-200 group-hover:text-primary">
                                      {item.icon}
                                    </span>
                                  )}

                                  {item.name}
                                </span>

                                {isIconRight && item.icon && (
                                  <span className="text-foreground/60 transition-colors duration-200 group-hover:text-primary">
                                    {item.icon}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Mobile Call to Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-4">
                <Button variant="outline" size="md" href="/auth">
                  Entrar
                </Button>

                <Button variant="primary" size="md" href="/auth">
                  Acessar Sistema
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}