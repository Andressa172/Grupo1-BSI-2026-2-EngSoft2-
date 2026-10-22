/**
 * ============================================================
 * COMPONENT NAME: LoginPage
 * ============================================================
 * PURPOSE:
 * Renders a clean, centered login page block based on the provided design.
 * Features:
 * - Google Sign-In button
 * - Styled "or" divider
 * - Form fields for Email and Password with active focus state
 * - Full-width submission button
 * - Footer links for Account Creation and Password Recovery
 * ============================================================
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';


export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demonstração: qualquer e-mail/senha preenchidos liberam o acesso.
    router.push('/dashboard');
  };

  const handleGoogleSignIn = () => {
    router.push('/dashboard');
  };

  return (
    <div className="relative  w-full bg-background text-foreground flex flex-col justify-between p-8">
      
      {/* Top Left Brand Logo */}
      <div className="mx-auto flex items-center justify-center mb-5">
          <Logo
                  src="/logo.svg"
                  alt="Logo ATLAS"
                  text="ATLAS"
                  href="/"
                  width={50}
                  height={50}
                  textClassName="text-xl font-medium tracking-tight text-foreground"

                />
      </div>

      {/* Main Centered Login Box */}
      <main className="w-full max-w-sm mx-auto  flex flex-col items-center">

        {/* Title */}
        <h1 className="text-3xl font-medium tracking-tight text-foreground text-center mb-8">
          Bem-vindo de volta
        </h1>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center cursor-pointer justify-center gap-3
          rounded-md border border-border-line/20 bg-background py-2.5 px-4 text-xs sm:text-sm
          font-medium text-foreground shadow-sm transition-all"
        >
          {/* Google Color SVG Icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Entrar com o Google</span>
        </button>

        {/* Divider with "or" */}
        <div className="relative my-6 w-full flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-line/20" />
          </div>
          <div className="relative bg-background px-3 text-xs text-foreground/50">
            ou
          </div>
        </div>

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">

          {/* Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-foreground"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              className="w-full rounded-md border border-border-line/20
               bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all
              placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-foreground"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full rounded-md border border-border-line/20
               bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all
              placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Log In Button */}
        <Button type="submit" variant='primary' size='md' className="w-full">
          Entrar
        </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 flex w-full items-center justify-between text-xs font-medium text-foreground/50">
          <Link
            href="#"
            className="underline underline-offset-2 transition-colors hover:text-primary"
          >
            Não tem uma conta?
          </Link>
          <Link
            href="#"
            className="underline underline-offset-2 transition-colors hover:text-primary"
          >
            Esqueceu a senha?
          </Link>
        </div>

      </main>

      {/* Spacer for vertical balance */}
      <div className="hidden sm:block" aria-hidden="true" />

    </div>
  );
}