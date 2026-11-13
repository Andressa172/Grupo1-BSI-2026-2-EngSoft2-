'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select } from '@/components/app/ui';
import { validarCNPJ } from '@/lib/cnpj';
import { mascaraCEP, mascaraCNPJ, mascaraTelefone, mascaraUF } from '@/view/mascaras';

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

interface EnderecoSeparado {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface FormOrganizacao extends EnderecoSeparado {
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  caminhoLogo: string;
}

type ErrosOrganizacao = Partial<Record<keyof FormOrganizacao | 'logo', string | null>>;

const TIPOS_LOGO_ACEITOS = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function parsearEndereco(enderecoBruto: string | null | undefined): EnderecoSeparado {
  const vazio: EnderecoSeparado = {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  };
  const texto = enderecoBruto?.trim() ?? '';
  if (!texto) return vazio;

  // Formato padrão: "Logradouro, Número (Complemento) - Bairro, Cidade/UF, CEP 00000-000"
  const match =
    /^(.+?),\s*([^-(,]+?)(?:\s*\(([^)]+)\))?\s*-\s*([^,]+),\s*([^/]+)\/([A-Za-z]{2})(?:,\s*CEP\s*(\d{5}-?\d{3}))?$/.exec(
      texto
    );
  if (match) {
    return {
      logradouro: match[1].trim(),
      numero: match[2].trim(),
      complemento: (match[3] ?? '').trim(),
      bairro: match[4].trim(),
      cidade: match[5].trim(),
      uf: mascaraUF(match[6]),
      cep: mascaraCEP(match[7] ?? ''),
    };
  }

  return { ...vazio, logradouro: texto };
}

function montarEndereco(end: EnderecoSeparado): string {
  const logradouro = end.logradouro.trim();
  const numero = end.numero.trim();
  const complemento = end.complemento.trim();
  const bairro = end.bairro.trim();
  const cidade = end.cidade.trim();
  const uf = end.uf.trim().toUpperCase();
  const cep = mascaraCEP(end.cep);

  const partes: string[] = [];
  if (logradouro) {
    const comp = complemento ? ` (${complemento})` : '';
    partes.push(numero ? `${logradouro}, ${numero}${comp}` : `${logradouro}${comp}`);
  }
  if (bairro) {
    partes.push(bairro);
  }
  const localidade = cidade && uf ? `${cidade}/${uf}` : cidade || uf;
  if (localidade) {
    partes.push(localidade);
  }
  if (cep) {
    partes.push(`CEP ${cep}`);
  }

  if (partes.length === 0) return '';
  if (logradouro && bairro) {
    const primeira = partes.shift()!;
    const segunda = partes.shift()!;
    return [`${primeira} - ${segunda}`, ...partes].join(', ');
  }
  return partes.join(', ');
}

const BORDA_ERRO = 'border-danger focus:border-danger focus:ring-danger/20';
const BORDA_VALIDA = 'border-success focus:border-success focus:ring-success/20';

function classeBordaCampo(erro: string | null | undefined, valor: string): string {
  if (erro) return BORDA_ERRO;
  if (valor.trim().length > 0) return BORDA_VALIDA;
  return '';
}

function validarCampoOrganizacao(
  campo: keyof FormOrganizacao,
  valor: string,
  obrigatorio = false
): string | null {
  const t = valor.trim();
  switch (campo) {
    case 'nomeFantasia': {
      if (!t) return obrigatorio ? 'O nome da organização é obrigatório.' : null;
      if (t.length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
      if (t.length > 120) return 'O nome deve ter no máximo 120 caracteres.';
      return null;
    }
    case 'cnpj': {
      if (!t) return null;
      return validarCNPJ(t) ? null : 'CNPJ inválido. Verifique os dígitos informados.';
    }
    case 'telefone': {
      const digitos = t.replace(/\D/g, '');
      if (!digitos) return null;
      return digitos.length === 10 || digitos.length === 11
        ? null
        : 'Informe um telefone válido com DDD (10 ou 11 dígitos).';
    }
    case 'email': {
      if (!t) return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? null : 'Informe um e-mail válido.';
    }
    case 'cep': {
      const digitos = t.replace(/\D/g, '');
      if (!digitos) return null;
      return digitos.length === 8 ? null : 'O CEP deve conter 8 dígitos (00000-000).';
    }
    case 'uf': {
      if (!t) return null;
      return /^[A-Z]{2}$/.test(t.toUpperCase()) ? null : 'A UF deve conter 2 letras.';
    }
    default:
      return null;
  }
}

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<FormOrganizacao>({
    nomeFantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    caminhoLogo: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });
  const [erros, setErros] = useState<ErrosOrganizacao>({});

  const [carregando, setCarregando] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const ultimoCepConsultado = useRef<string>('');
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
        const end = parsearEndereco(dados.endereco);
        setForm({
          nomeFantasia: dados.nomeFantasia ?? '',
          cnpj: mascaraCNPJ(dados.cnpj ?? ''),
          telefone: mascaraTelefone(dados.telefone ?? ''),
          email: dados.email ?? '',
          caminhoLogo: dados.caminhoLogo ?? '',
          ...end,
        });
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar dados.');
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  async function consultarViaCep(cepFormatado: string) {
    const digitos = cepFormatado.replace(/\D/g, '');
    if (digitos.length !== 8 || digitos === ultimoCepConsultado.current) {
      return;
    }

    ultimoCepConsultado.current = digitos;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      if (!res.ok) {
        throw new Error('Falha ao consultar o CEP.');
      }
      const dados = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (dados.erro) {
        setErros((prev) => ({ ...prev, cep: 'CEP não encontrado.' }));
        return;
      }

      setForm((prev) => ({
        ...prev,
        logradouro: dados.logradouro || prev.logradouro,
        complemento: dados.complemento || prev.complemento,
        bairro: dados.bairro || prev.bairro,
        cidade: dados.localidade || prev.cidade,
        uf: dados.uf ? mascaraUF(dados.uf) : prev.uf,
      }));
      setErros((prev) => ({
        ...prev,
        cep: null,
        logradouro: null,
        uf: null,
      }));
    } catch {
      setErros((prev) => ({ ...prev, cep: 'Não foi possível consultar o CEP no momento.' }));
    } finally {
      setBuscandoCep(false);
    }
  }

  function aoAlterarLogo(arquivo: File | null) {
    if (!arquivo) {
      setLogoArquivo(null);
      setErros((prev) => ({ ...prev, logo: null }));
      return;
    }
    if (!TIPOS_LOGO_ACEITOS.has(arquivo.type)) {
      setLogoArquivo(null);
      setErros((prev) => ({ ...prev, logo: 'Formato inválido. Use PNG, JPEG, GIF ou WebP.' }));
      return;
    }
    if (arquivo.size > MAX_LOGO_BYTES) {
      setLogoArquivo(null);
      setErros((prev) => ({ ...prev, logo: 'O logo deve ter no máximo 5 MB.' }));
      return;
    }
    setLogoArquivo(arquivo);
    setErros((prev) => ({ ...prev, logo: null }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const enderecoMontado = montarEndereco(form);
    const novosErros: ErrosOrganizacao = {
      nomeFantasia: validarCampoOrganizacao('nomeFantasia', form.nomeFantasia, true),
      cnpj: validarCampoOrganizacao('cnpj', form.cnpj),
      telefone: validarCampoOrganizacao('telefone', form.telefone),
      email: validarCampoOrganizacao('email', form.email),
      cep: validarCampoOrganizacao('cep', form.cep),
      uf: validarCampoOrganizacao('uf', form.uf),
      logo: erros.logo ?? null,
    };

    if (enderecoMontado.length > 255) {
      novosErros.logradouro = 'O endereço combinado ultrapassa o limite de 255 caracteres.';
    }

    setErros(novosErros);
    if (Object.values(novosErros).some(Boolean)) {
      return;
    }

    setSalvando(true);
    try {
      const dados = new FormData();
      dados.append('nomeFantasia', form.nomeFantasia.trim());
      dados.append('cnpj', form.cnpj.trim());
      dados.append('endereco', enderecoMontado);
      dados.append('telefone', form.telefone.trim());
      dados.append('email', form.email.trim());
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
      window.location.reload();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar alterações.');
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
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-border-line/10 font-medium text-sm">
            <Building2 size={18} className="text-foreground/50" aria-hidden />
            <h2>Identidade e dados cadastrais</h2>
          </div>

          <Field label="Nome / nome fantasia *">
            <Input
              value={form.nomeFantasia}
              onChange={(e) => {
                const valor = e.target.value;
                setForm({ ...form, nomeFantasia: valor });
                setErros((prev) => ({
                  ...prev,
                  nomeFantasia: validarCampoOrganizacao('nomeFantasia', valor),
                }));
              }}
              placeholder="ex: SOS Criança"
              className={classeBordaCampo(erros.nomeFantasia, form.nomeFantasia)}
            />
            {erros.nomeFantasia && <p className="text-xs text-danger">{erros.nomeFantasia}</p>}
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="CNPJ">
              <Input
                maxLength={18}
                value={form.cnpj}
                onChange={(e) => {
                  const valor = mascaraCNPJ(e.target.value);
                  setForm({ ...form, cnpj: valor });
                  setErros((prev) => ({ ...prev, cnpj: validarCampoOrganizacao('cnpj', valor) }));
                }}
                onBlur={(e) => {
                  const valor = mascaraCNPJ(e.target.value);
                  setErros((prev) => ({ ...prev, cnpj: validarCampoOrganizacao('cnpj', valor) }));
                }}
                placeholder="00.000.000/0000-00"
                className={classeBordaCampo(erros.cnpj, form.cnpj)}
              />
              {erros.cnpj && <p className="text-xs text-danger">{erros.cnpj}</p>}
            </Field>

            <Field label="Telefone de contato">
              <Input
                type="tel"
                inputMode="tel"
                maxLength={15}
                value={form.telefone}
                onChange={(e) => {
                  const valor = mascaraTelefone(e.target.value);
                  setForm({ ...form, telefone: valor });
                  setErros((prev) => ({
                    ...prev,
                    telefone: validarCampoOrganizacao('telefone', valor),
                  }));
                }}
                placeholder="(00) 00000-0000"
                className={classeBordaCampo(erros.telefone, form.telefone)}
              />
              {erros.telefone && <p className="text-xs text-danger">{erros.telefone}</p>}
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="E-mail institucional">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => {
                  const valor = e.target.value;
                  setForm({ ...form, email: valor });
                  setErros((prev) => ({ ...prev, email: validarCampoOrganizacao('email', valor) }));
                }}
                placeholder="contato@organizacao.org"
                className={classeBordaCampo(erros.email, form.email)}
              />
              {erros.email && <p className="text-xs text-danger">{erros.email}</p>}
            </Field>

            <Field label="Logo da organização">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => aoAlterarLogo(e.target.files?.[0] ?? null)}
                className={`text-foreground/50 py-1.5 file:mr-4 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground/70 ${
                  erros.logo ? BORDA_ERRO : logoArquivo ? BORDA_VALIDA : ''
                }`}
              />
              {erros.logo ? (
                <p className="text-xs text-danger">{erros.logo}</p>
              ) : (
                <span className="mt-1 text-xs text-foreground/50">
                  PNG, JPEG, GIF ou WebP, até 5 MB.
                  {logoArquivo ? ` Arquivo selecionado: ${logoArquivo.name}` : ''}
                </span>
              )}
            </Field>
          </div>

          <div className="border-t border-border-line/10 pt-4 flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Endereço</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="CEP">
                <Input
                  inputMode="numeric"
                  maxLength={9}
                  value={form.cep}
                  onChange={(e) => {
                    const valor = mascaraCEP(e.target.value);
                    setForm({ ...form, cep: valor });
                    setErros((prev) => ({ ...prev, cep: validarCampoOrganizacao('cep', valor) }));
                    if (valor.replace(/\D/g, '').length === 8) {
                      void consultarViaCep(valor);
                    }
                  }}
                  onBlur={(e) => {
                    const valor = mascaraCEP(e.target.value);
                    setErros((prev) => ({ ...prev, cep: validarCampoOrganizacao('cep', valor) }));
                    if (valor.replace(/\D/g, '').length === 8) {
                      void consultarViaCep(valor);
                    }
                  }}
                  placeholder="00000-000"
                  className={classeBordaCampo(erros.cep, form.cep)}
                />
                {buscandoCep ? (
                  <span className="text-xs text-foreground/50">Buscando endereço...</span>
                ) : (
                  erros.cep && <p className="text-xs text-danger">{erros.cep}</p>
                )}
              </Field>

              <div className="md:col-span-2">
                <Field label="Logradouro / rua">
                  <Input
                    value={form.logradouro}
                    onChange={(e) => {
                      setForm({ ...form, logradouro: e.target.value });
                      setErros((prev) => ({ ...prev, logradouro: null }));
                    }}
                    placeholder="ex: Rua das Flores"
                    className={classeBordaCampo(erros.logradouro, form.logradouro)}
                  />
                  {erros.logradouro && <p className="text-xs text-danger">{erros.logradouro}</p>}
                </Field>
              </div>

              <Field label="Número">
                <Input
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  placeholder="ex: 123"
                  className={classeBordaCampo(null, form.numero)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Complemento">
                <Input
                  value={form.complemento}
                  onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  placeholder="ex: Sala 2"
                  className={classeBordaCampo(null, form.complemento)}
                />
              </Field>

              <Field label="Bairro">
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  placeholder="ex: Centro"
                  className={classeBordaCampo(null, form.bairro)}
                />
              </Field>

              <Field label="Cidade">
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  placeholder="ex: Presidente Prudente"
                  className={classeBordaCampo(null, form.cidade)}
                />
              </Field>

              <Field label="UF">
                <Select
                  value={form.uf}
                  onChange={(e) => {
                    const valor = mascaraUF(e.target.value);
                    setForm({ ...form, uf: valor });
                    setErros((prev) => ({ ...prev, uf: validarCampoOrganizacao('uf', valor) }));
                  }}
                  className={classeBordaCampo(erros.uf, form.uf)}
                >
                  <option value="">Selecione</option>
                  {UFS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </Select>
                {erros.uf && <p className="text-xs text-danger">{erros.uf}</p>}
              </Field>
            </div>
          </div>

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
