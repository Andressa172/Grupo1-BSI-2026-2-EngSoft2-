'use client';

/**
 * Tela de Funcionários (RF_B2 - Gerenciar Funcionários)
 * Cadastra e lista os funcionários (usuários do sistema) usando a API /api/usuarios.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Table, THead, EmptyRow } from '@/components/app/ui';
import type { PerfilUsuario } from '@/lib/types';

interface Funcionario {
  id: number;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  cpf: string | null;
  ativo: boolean;
}

interface FormFuncionario {
  nome: string;
  login: string;
  senha: string;
  perfil: PerfilUsuario;
  cpf: string;
}

const FORM_VAZIO: FormFuncionario = {
  nome: '',
  login: '',
  senha: '',
  perfil: 'FUNCIONARIO',
  cpf: '',
};

const LABEL_PERFIL: Record<PerfilUsuario, string> = {
  GERENTE: 'Gerente',
  SECRETARIO: 'Secretário',
  FUNCIONARIO: 'Funcionário',
};

function aplicarMascaraCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

function validarCPFFormulario(cpf: string): boolean {
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(digitos[i]) * (10 - i);
  }
  let primeiroDigito = (soma * 10) % 11;
  if (primeiroDigito === 10) primeiroDigito = 0;
  if (primeiroDigito !== Number(digitos[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(digitos[i]) * (11 - i);
  }
  let segundoDigito = (soma * 10) % 11;
  if (segundoDigito === 10) segundoDigito = 0;
  return segundoDigito === Number(digitos[10]);
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [form, setForm] = useState<FormFuncionario>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function carregarFuncionarios() {
    const resposta = await fetch('/api/usuarios');
    if (resposta.ok) {
      const dados = await resposta.json();
      setFuncionarios(dados);
    }
  }

  useEffect(() => {
    fetch('/api/usuarios')
      .then((resposta) => (resposta.ok ? resposta.json() : []))
      .then((dados) => setFuncionarios(dados));
  }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!form.nome.trim() || !form.login.trim() || !form.senha.trim() || !form.cpf.trim()) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!validarCPFFormulario(form.cpf)) {
      setErro('O CPF informado é inválido.');
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (resposta.ok) {
        setForm(FORM_VAZIO);
        setSucesso('Funcionário cadastrado com sucesso.');
        await carregarFuncionarios();
      } else {
        const corpo = await resposta.json();
        setErro(corpo.erro ?? 'Não foi possível cadastrar o funcionário.');
      }
    } catch {
      setErro('Erro ao conectar com o servidor.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground/50 max-w-xl">
        Cadastro de funcionários (RF_B2): gerencie os usuários com acesso ao sistema ATLAS e seus respectivos cargos.
      </p>

      <Card className="p-6">
        <h2 className="text-base font-medium tracking-tight mb-4">Cadastrar Funcionário</h2>
        <form onSubmit={cadastrar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome">
              <Input
                placeholder="Nome completo do funcionário"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </Field>

            <Field label="Documento (CPF)">
              <Input
                placeholder="000.000.000-00"
                maxLength={14}
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: aplicarMascaraCPF(e.target.value) })}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Login">
              <Input
                placeholder="Identificador de acesso"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                required
              />
            </Field>

            <Field label="Senha">
              <Input
                type="password"
                placeholder="Digite a senha de acesso"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required
              />
            </Field>

            <Field label="Cargo">
              <Select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilUsuario })}
              >
                <option value="GERENTE">Gerente</option>
                <option value="SECRETARIO">Secretário</option>
                <option value="FUNCIONARIO">Funcionário</option>
              </Select>
            </Field>
          </div>

          {erro && <p className="text-sm text-primary">{erro}</p>}
          {sucesso && <p className="text-sm text-green-700">{sucesso}</p>}

          <div className="flex justify-end mt-1">
            <Button type="submit" variant="primary" size="md" isLoading={carregando}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Card>

      <Table>
        <THead cols={['Nome', 'Login', 'CPF', 'Cargo']} />
        <tbody>
          {funcionarios.length === 0 && <EmptyRow colSpan={4} label="Nenhum funcionário cadastrado." />}
          {funcionarios.map((f) => (
            <tr key={f.id} className="border-b border-border-line/10 last:border-0">
              <td className="px-4 py-3 font-medium">{f.nome}</td>
              <td className="px-4 py-3 text-foreground/60">{f.login}</td>
              <td className="px-4 py-3 text-foreground/60">{f.cpf || '—'}</td>
              <td className="px-4 py-3 text-foreground/60">{LABEL_PERFIL[f.perfil] ?? f.perfil}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

