'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';

type Erros = Record<string, string>;

export const CHAVE_USUARIO_LOGADO = 'atlas-usuario-logado';

export default function AuthPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  const alterarLogin = (valor: string) => {
    setLogin(valor);
    if (erros.login) {
      const resto = { ...erros };
      delete resto.login;
      setErros(resto);
    }
    if (erroGeral) setErroGeral('');
  };

  const alterarSenha = (valor: string) => {
    setSenha(valor);
    if (erros.senha) {
      const resto = { ...erros };
      delete resto.senha;
      setErros(resto);
    }
    if (erroGeral) setErroGeral('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros({});
    setErroGeral('');
    setCarregando(true);

    try {
      const resposta = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });

      const corpo = await resposta.json();

      if (resposta.ok) {
        try {
          window.localStorage.setItem(CHAVE_USUARIO_LOGADO, JSON.stringify(corpo));
        } catch {
          // armazenamento indisponível
        }
        router.push('/dashboard');
      } else {
        if (corpo.erros) {
          setErros(corpo.erros);
        } else {
          // destaca os inputs como inválidos quando falha autenticação
          setErros({ login: '', senha: '' });
          setErroGeral(corpo.erro ?? 'Credenciais inválidas.');
        }
      }
    } catch {
      setErroGeral('Erro ao validar as credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  const loginInvalido = 'login' in erros;
  const senhaInvalida = 'senha' in erros;

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

        <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
          <p className="text-xs text-foreground/50">
            Campos com <span className="text-primary font-semibold">*</span> são obrigatórios.
          </p>

          {/* Login Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login"
              className="block text-xs font-semibold text-foreground"
            >
              Usuário <span className="text-primary">*</span>
            </label>
            <input
              id="login"
              type="text"
              required
              value={login}
              onChange={(e) => alterarLogin(e.target.value)}
              placeholder="Digite seu usuário"
              aria-invalid={loginInvalido ? true : undefined}
              aria-describedby={erros.login ? 'erro-login' : undefined}
              className={`w-full rounded-md border bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                loginInvalido ? 'border-primary! focus:ring-primary/30' : 'border-border-line/20'
              }`}
            />
            {erros.login && (
              <span id="erro-login" className="text-xs text-primary block">
                {erros.login}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-foreground"
            >
              Senha <span className="text-primary">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={senha}
              onChange={(e) => alterarSenha(e.target.value)}
              placeholder="Digite sua senha"
              aria-invalid={senhaInvalida ? true : undefined}
              aria-describedby={erros.senha ? 'erro-senha' : undefined}
              className={`w-full rounded-md border bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                senhaInvalida ? 'border-primary! focus:ring-primary/30' : 'border-border-line/20'
              }`}
            />
            {erros.senha && (
              <span id="erro-senha" className="text-xs text-primary block">
                {erros.senha}
              </span>
            )}
          </div>

          {erroGeral && <p className="text-sm text-primary">{erroGeral}</p>}

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
