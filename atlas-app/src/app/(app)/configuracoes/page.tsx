'use client';

import { useEffect, useState } from 'react';
import { Save, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Field, Input } from '@/components/app/ui';

interface FormOrganizacao {
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  caminhoLogo: string;
}

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<FormOrganizacao>({
    nomeFantasia: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    caminhoLogo: '',
  });

  const [carregando, setCarregando] = useState(true);
  const [logoArquivo, setLogoArquivo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!logoArquivo) {
      setLogoPreview(null);
      return;
    }

    const url = URL.createObjectURL(logoArquivo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoArquivo]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const res = await fetch('/api/organizacao');
        if (!res.ok) throw new Error('Falha ao obter os dados da organização.');
        const dados = await res.json();
        setForm({
          nomeFantasia: dados.nomeFantasia ?? '',
          cnpj: dados.cnpj ?? '',
          endereco: dados.endereco ?? '',
          telefone: dados.telefone ?? '',
          email: dados.email ?? '',
          caminhoLogo: dados.caminhoLogo ?? '',
        });
      } catch (e: any) {
        setErro(e.message ?? 'Erro ao carregar dados.');
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setMensagemSucesso(null);

    try {
      const dados = new FormData();
      dados.append('nomeFantasia', form.nomeFantasia);
      dados.append('cnpj', form.cnpj);
      dados.append('endereco', form.endereco);
      dados.append('telefone', form.telefone);
      dados.append('email', form.email);
      dados.append('caminhoLogo', form.caminhoLogo);
      if (logoArquivo) dados.append('logo', logoArquivo);

      const res = await fetch('/api/organizacao', {
        method: 'POST',
        body: dados,
      });

      const resposta = await res.json();

      if (!res.ok) {
        throw new Error(resposta.erro ?? 'Erro ao salvar parâmetros.');
      }

      setMensagemSucesso('Parâmetros da organização atualizados com sucesso!');
      
      // Atualiza o shell/sidebar recarregando os dados globais
      window.location.reload();
    } catch (e: any) {
      setErro(e.message ?? 'Falha ao salvar alterações.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-foreground/50">Carregando parâmetros do sistema...</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {mensagemSucesso && (
        <div role="status" className="p-3 text-sm rounded-lg bg-success/10 border border-success/20 text-success">
          {mensagemSucesso}
        </div>
      )}

      {erro && (
        <div role="alert" className="p-3 text-sm rounded-lg bg-danger/10 border border-danger/20 text-danger">
          {erro}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-border-line/10 font-medium text-sm">
            <Building2 size={18} className="text-foreground/50" aria-hidden />
            <h2>Identidade e dados cadastrais</h2>
          </div>

          <Field label="Nome / nome fantasia *">
            <Input
              required
              value={form.nomeFantasia}
              onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
              placeholder="ex: SOS Criança"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="CNPJ">
              <Input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </Field>

            <Field label="Telefone de contato">
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="E-mail institucional">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@organizacao.org"
              />
            </Field>

            <Field label="Logo da organização">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => setLogoArquivo(e.target.files?.[0] ?? null)}
                className="text-foreground/50 py-1.5 file:mr-4 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground/70"
              />
              <span className="mt-1 text-xs text-foreground/50">
                PNG, JPEG, GIF ou WebP, até 5 MB.
                {logoArquivo ? ` Arquivo selecionado: ${logoArquivo.name}` : ''}
              </span>
            </Field>
          </div>

          <Field label="Endereço completo">
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, Número, Bairro, Cidade - UF"
            />
          </Field>

          {(logoPreview || form.caminhoLogo) && (
            <div className="flex items-center gap-4 p-3 rounded-lg border border-border-line/10 bg-background/50">
              <span className="text-xs text-foreground/50">Pré-visualização do logo:</span>
              <img
                src={logoPreview ?? form.caminhoLogo}
                alt="Prévia do Logo"
                className="h-10 w-auto object-contain max-w-[160px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border-line/10">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={salvando}
              iconLeft={<Save size={16} />}
            >
              {salvando ? 'Salvando...' : 'Salvar parâmetros'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}