'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/ui/logo';
import { Button } from '@/components/ui/button';

type Erros = Record<string, string>;

export const CHAVE_USUARIO_LOGADO = 'atlas-usuario-logado';

export default function AuthPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [foiValidado, setFoiValidado] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  function validarCampos(valorLogin: string, valorSenha: string): Erros {
    const novosErros: Erros = {};
    if (!valorLogin.trim()) {
      novosErros.login = 'Campo obrigatório: por favor, informe o usuário.';
    }
    if (!valorSenha) {
      novosErros.senha = 'Campo obrigatório: por favor, informe a senha.';
    }
    return novosErros;
  }

  const alterarLogin = (valor: string) => {
    setLogin(valor);
    if (foiValidado) {
      setErros(validarCampos(valor, senha));
    }
    if (erroGeral) setErroGeral('');
  };

  const alterarSenha = (valor: string) => {
    setSenha(valor);
    if (foiValidado) {
      setErros(validarCampos(login, valor));
    }
    if (erroGeral) setErroGeral('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroGeral('');
    setFoiValidado(true);

    const errosValidacao = validarCampos(login, senha);
    setErros(errosValidacao);

    if (Object.keys(errosValidacao).length > 0) {
      return;
    }

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
          setErros({});
          setFoiValidado(false);
          setErroGeral(corpo.erro ?? 'Usuário não encontrado.');
        }
      }
    } catch {
      setErroGeral('Usuário não encontrado.');
    } finally {
      setCarregando(false);
    }
  };

  const loginInvalido = foiValidado && Boolean(erros.login);
  const loginValido = foiValidado && !erros.login && login.trim().length > 0;
  const senhaInvalida = foiValidado && Boolean(erros.senha);
  const senhaValida = foiValidado && !erros.senha && senha.length > 0;

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

        <form
          onSubmit={handleSubmit}
          noValidate
          className={`needs-validation w-full space-y-4 ${foiValidado ? 'was-validated' : ''}`}
        >
          {/* Login Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login"
              className="form-label block text-xs font-semibold text-foreground"
            >
              Usuário <span className="text-primary">*</span>
            </label>
            <div className="relative has-validation">
              <input
                id="login"
                type="text"
                required
                value={login}
                onChange={(e) => alterarLogin(e.target.value)}
                placeholder="Digite seu usuário"
                aria-invalid={loginInvalido ? true : undefined}
                aria-describedby={loginInvalido ? 'erro-login' : undefined}
                className={`form-control w-full rounded-md border bg-background px-3.5 py-2 pr-9 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 ${
                  loginInvalido
                    ? 'is-invalid border-primary! focus:border-primary focus:ring-2 focus:ring-primary/30'
                    : loginValido
                    ? 'is-valid border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'
                    : 'border-border-line/20 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {loginInvalido && (
                <AlertCircle
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                />
              )}
              {loginValido && (
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-600"
                />
              )}
            </div>
            {loginInvalido && (
              <div id="erro-login" className="invalid-feedback text-xs text-primary">
                {erros.login}
              </div>
            )}
            {loginValido && (
              <div className="valid-feedback text-xs text-green-700">
                Preenchido corretamente!
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="form-label block text-xs font-semibold text-foreground"
            >
              Senha <span className="text-primary">*</span>
            </label>
            <div className="relative has-validation">
              <input
                id="password"
                type="password"
                required
                value={senha}
                onChange={(e) => alterarSenha(e.target.value)}
                placeholder="Digite sua senha"
                aria-invalid={senhaInvalida ? true : undefined}
                aria-describedby={senhaInvalida ? 'erro-senha' : undefined}
                className={`form-control w-full rounded-md border bg-background px-3.5 py-2 pr-9 text-xs sm:text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-foreground/50 ${
                  senhaInvalida
                    ? 'is-invalid border-primary! focus:border-primary focus:ring-2 focus:ring-primary/30'
                    : senhaValida
                    ? 'is-valid border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20'
                    : 'border-border-line/20 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {senhaInvalida && (
                <AlertCircle
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                />
              )}
              {senhaValida && (
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-600"
                />
              )}
            </div>
            {senhaInvalida && (
              <div id="erro-senha" className="invalid-feedback text-xs text-primary">
                {erros.senha}
              </div>
            )}
            {senhaValida && (
              <div className="valid-feedback text-xs text-green-700">
                Preenchido corretamente!
              </div>
            )}
          </div>

          {erroGeral && (
            <div role="alert" className="text-sm text-primary">
              {erroGeral}
            </div>
          )}

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
