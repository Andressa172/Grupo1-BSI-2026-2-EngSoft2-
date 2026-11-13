'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });

      if (resposta.ok) {
        const usuario = await resposta.json();
        try {
          localStorage.setItem('atlas_usuario', JSON.stringify(usuario));
        } catch {
          // ignora se localStorage estiver indisponível
        }
        router.push('/dashboard');
      } else {
        const corpo = await resposta.json();
        setErro(corpo.erro ?? 'Credenciais inválidas.');
      }
    } catch {
      setErro('Erro ao validar as credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="relative w-full bg-background text-foreground flex flex-col justify-between p-8">
      {/* Top Brand Logo */}
      <div className="mx-auto flex items-center justify-center mb-5">
        <Logo
          alt="Logo ATLAS"
          text="ATLAS"
          href="/"
          textClassName="text-2xl font-medium tracking-tight text-foreground"
        />
      </div>

      {/* Main Centered Login Box */}
      <main className="w-full max-w-sm mx-auto flex flex-col items-center">
        <h1 className="text-3xl font-medium tracking-tight text-foreground text-center mb-8">
          Bem-vindo de volta
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Login Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login"
              className="block text-xs font-semibold text-foreground"
            >
              Usuário
            </label>
            <input
              id="login"
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Digite seu usuário"
              className="w-full rounded-md border border-border-line/20 bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full rounded-md border border-border-line/20 bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {erro && <p className="text-sm text-primary">{erro}</p>}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={carregando}
          >
            Entrar
          </Button>
        </form>
      </main>

      <div className="hidden sm:block" aria-hidden="true" />
    </div>
  );
}
