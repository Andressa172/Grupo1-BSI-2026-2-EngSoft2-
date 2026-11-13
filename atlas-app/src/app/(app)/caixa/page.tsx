'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow, StatusPill } from '@/components/app/ui';
import { mascaraMoeda, parseMoedaBR } from '@/view/mascaras';
import type { TipoMovimentacao } from '@/lib/types';

type FormaPag = 'FISICO' | 'DIGITAL';

interface MovimentacaoDTO {
  id: number;
  caixaId: number;
  tipo: TipoMovimentacao;
  formaPag: FormaPag;
  valor: number;
  origem: string;
  data?: string;
}

interface CaixaDTO {
  id: number;
  dataAbertura?: string;
  dataFechamento?: string | null;
  saldoFisicoAbertura: number;
  saldoDigitalAbertura: number;
  saldoFisicoFechamento?: number | null;
  saldoDigitalFechamento?: number | null;
  status: 'ABERTO' | 'FECHADO';
  abertoPor: number;
}

interface CaixaAbertoDTO extends CaixaDTO {
  movimentacoes: MovimentacaoDTO[];
  saldosAtuais: { fisico: number; digital: number };
}

interface DivergenciaDTO {
  esperado: { fisico: number; digital: number };
  informado: { fisico: number; digital: number };
  diferenca: { fisico: number; digital: number };
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function obterHeadersUsuario(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const bruto = localStorage.getItem('atlas-usuario-logado');
    if (bruto) {
      const usuario = JSON.parse(bruto) as { id?: number };
      if (usuario?.id) {
        headers['x-usuario-id'] = String(usuario.id);
      }
    }
  } catch {
    // ignora
  }
  return headers;
}

const BORDA_ERRO = 'border-danger focus:border-danger focus:ring-danger/20';
const BORDA_VALIDA = 'border-success focus:border-success focus:ring-success/20';

function classeBordaCampo(erro: string | null | undefined, valor: string): string {
  if (erro) return BORDA_ERRO;
  if (valor.trim().length > 0) return BORDA_VALIDA;
  return '';
}

function validarSaldoInput(valor: string, obrigatorio = false): string | null {
  if (valor.trim() === '') {
    return obrigatorio ? 'Informe um valor.' : null;
  }
  const num = parseMoedaBR(valor);
  if (!Number.isFinite(num)) {
    return 'Informe um valor monetário válido.';
  }
  if (num < 0) {
    return 'O valor não pode ser negativo.';
  }
  return null;
}

function validarValorMovimentacaoInput(valor: string, obrigatorio = false): string | null {
  if (valor.trim() === '') {
    return obrigatorio ? 'Informe o valor da movimentação.' : null;
  }
  const num = parseMoedaBR(valor);
  if (!Number.isFinite(num)) {
    return 'Informe um valor monetário válido.';
  }
  if (num < 0) {
    return 'O valor não pode ser negativo.';
  }
  if (num === 0) {
    return 'O valor deve ser maior que zero.';
  }
  return null;
}

export default function CaixaPage() {
  const [caixaAberto, setCaixaAberto] = useState<CaixaAbertoDTO | null>(null);
  const [caixas, setCaixas] = useState<CaixaDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroPagina, setErroPagina] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);

  const [abrirForm, setAbrirForm] = useState({ fisico: '', digital: '' });
  const [abrirErros, setAbrirErros] = useState<{ fisico?: string | null; digital?: string | null }>({});
  const [movForm, setMovForm] = useState<{
    tipo: TipoMovimentacao;
    formaPag: FormaPag;
    valor: string;
    origem: string;
  }>({
    tipo: 'ENTRADA',
    formaPag: 'FISICO',
    valor: '',
    origem: '',
  });
  const [movErros, setMovErros] = useState<{ valor?: string | null; origem?: string | null }>({});
  const [fecharForm, setFecharForm] = useState({
    fisico: '',
    digital: '',
    justificativa: '',
  });
  const [fecharErros, setFecharErros] = useState<{
    fisico?: string | null;
    digital?: string | null;
    justificativa?: string | null;
  }>({});
  const [divergencia, setDivergencia] = useState<DivergenciaDTO | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregarCaixa = useCallback(async () => {
    try {
      setErroPagina(null);
      const res = await fetch('/api/caixa');
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados.erro ?? 'Erro ao carregar dados do caixa.');
      }
      setCaixaAberto(dados.caixaAberto ?? null);
      setCaixas(dados.caixas ?? []);
    } catch (e: unknown) {
      setErroPagina(e instanceof Error ? e.message : 'Erro ao carregar dados do caixa.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCaixa();
  }, [carregarCaixa]);

  const saldoFisicoAtual = caixaAberto?.saldosAtuais.fisico ?? 0;
  const saldoDigitalAtual = caixaAberto?.saldosAtuais.digital ?? 0;
  const saldoAtual = saldoFisicoAtual + saldoDigitalAtual;

  async function submitAbrir(e: React.FormEvent) {
    e.preventDefault();
    setErroModal(null);

    const erroFisico = validarSaldoInput(abrirForm.fisico, true);
    const erroDigital = validarSaldoInput(abrirForm.digital, true);
    if (erroFisico || erroDigital) {
      setAbrirErros({ fisico: erroFisico, digital: erroDigital });
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: obterHeadersUsuario(),
        body: JSON.stringify({
          saldoFisicoInicial: parseMoedaBR(abrirForm.fisico),
          saldoDigitalInicial: parseMoedaBR(abrirForm.digital),
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados.erro ?? 'Não foi possível abrir o caixa.');
      }
      setAbrirForm({ fisico: '', digital: '' });
      setAbrirErros({});
      setAbrirOpen(false);
      setMensagem('Caixa aberto com sucesso.');
      await carregarCaixa();
    } catch (e: unknown) {
      setErroModal(e instanceof Error ? e.message : 'Erro ao abrir caixa.');
    } finally {
      setEnviando(false);
    }
  }

  async function submitMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    setErroModal(null);

    const erroValor = validarValorMovimentacaoInput(movForm.valor, true);
    const erroOrigem = movForm.origem.trim() === '' ? 'Informe a origem da movimentação.' : null;
    if (erroValor || erroOrigem) {
      setMovErros({ valor: erroValor, origem: erroOrigem });
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/caixa/movimentacoes', {
        method: 'POST',
        headers: obterHeadersUsuario(),
        body: JSON.stringify({
          tipoMovimentacao: movForm.tipo,
          formaPag: movForm.formaPag,
          valor: parseMoedaBR(movForm.valor),
          origem: movForm.origem.trim(),
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados.erro ?? 'Não foi possível registrar a movimentação.');
      }
      setMovForm({ tipo: 'ENTRADA', formaPag: 'FISICO', valor: '', origem: '' });
      setMovErros({});
      setMovOpen(false);
      setMensagem('Movimentação registrada com sucesso.');
      await carregarCaixa();
    } catch (e: unknown) {
      setErroModal(e instanceof Error ? e.message : 'Erro ao registrar movimentação.');
    } finally {
      setEnviando(false);
    }
  }

  async function submitFechar(e: React.FormEvent) {
    e.preventDefault();
    setErroModal(null);

    const erroFisico = validarSaldoInput(fecharForm.fisico, true);
    const erroDigital = validarSaldoInput(fecharForm.digital, true);
    const erroJustificativa =
      divergencia && fecharForm.justificativa.trim() === ''
        ? 'Informe a justificativa para confirmar com ressalva.'
        : null;
    if (erroFisico || erroDigital || erroJustificativa) {
      setFecharErros({ fisico: erroFisico, digital: erroDigital, justificativa: erroJustificativa });
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch('/api/caixa/fechar', {
        method: 'POST',
        headers: obterHeadersUsuario(),
        body: JSON.stringify({
          saldoFisicoFinal: parseMoedaBR(fecharForm.fisico),
          saldoDigitalFinal: parseMoedaBR(fecharForm.digital),
          confirmarComRessalva: Boolean(divergencia),
          justificativa: fecharForm.justificativa.trim() || undefined,
        }),
      });
      const dados = await res.json();
      if (res.status === 409 && dados.requerConfirmacaoRessalva) {
        setDivergencia({
          esperado: dados.esperado,
          informado: dados.informado,
          diferenca: dados.diferenca,
        });
        setErroModal(dados.erro ?? 'Há divergência nos valores informados.');
        return;
      }
      if (!res.ok) {
        throw new Error(dados.erro ?? 'Não foi possível fechar o caixa.');
      }
      setFecharForm({ fisico: '', digital: '', justificativa: '' });
      setFecharErros({});
      setDivergencia(null);
      setFecharOpen(false);
      setMensagem(
        dados.consolidado?.comRessalva
          ? 'Caixa fechado com ressalva registrada.'
          : 'Caixa fechado com sucesso.'
      );
      await carregarCaixa();
    } catch (e: unknown) {
      setErroModal(e instanceof Error ? e.message : 'Erro ao fechar caixa.');
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-foreground/50">Carregando controle de caixa...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {mensagem && (
        <div role="status" className="p-3 text-sm rounded-lg bg-success/10 border border-success/20 text-success">
          {mensagem}
        </div>
      )}

      {erroPagina && (
        <div role="alert" className="p-3 text-sm rounded-lg bg-danger/10 border border-danger/20 text-danger">
          {erroPagina}
        </div>
      )}

      <Card className="p-6">
        {caixaAberto ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status="ABERTO" />
                  <span className="text-xs text-foreground/50">desde {formatDateTime(caixaAberto.dataAbertura)}</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatBRL(saldoAtual)}</p>
                <p className="text-xs text-foreground/50 mt-1">
                  Físico: {formatBRL(saldoFisicoAtual)} · Digital: {formatBRL(saldoDigitalAtual)}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setErroModal(null);
                    setMovOpen(true);
                  }}
                >
                  Registrar movimentação
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<Lock size={16} />}
                  onClick={() => {
                    setErroModal(null);
                    setDivergencia(null);
                    setFecharOpen(true);
                  }}
                >
                  Fechar caixa
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <StatusPill status="FECHADO" />
              <p className="text-sm text-foreground/50 mt-2">Nenhum caixa aberto no momento.</p>
            </div>
            <Button
              variant="primary"
              size="md"
              iconLeft={<Unlock size={16} />}
              onClick={() => {
                setErroModal(null);
                setAbrirOpen(true);
              }}
            >
              Abrir caixa
            </Button>
          </div>
        )}
      </Card>

      {caixaAberto && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Movimentações do caixa atual</h2>
          <Table>
            <THead
              cols={[
                { label: 'Data', className: 'hidden sm:table-cell' },
                'Tipo',
                { label: 'Forma', className: 'hidden sm:table-cell' },
                { label: 'Valor', className: 'text-right' },
                { label: 'Origem', className: 'hidden md:table-cell' },
              ]}
            />
            <tbody>
              {caixaAberto.movimentacoes.length === 0 && (
                <EmptyRow colSpan={5} label="Nenhuma movimentação registrada neste caixa." />
              )}
              {caixaAberto.movimentacoes.map((m) => (
                <tr key={m.id} className="border-b border-border-line/10 last:border-0">
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">
                    {formatDateTime(m.data)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 ${m.tipo === 'ENTRADA' ? 'text-success' : 'text-primary'}`}>
                      {m.tipo === 'ENTRADA' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      {m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">
                    {m.formaPag === 'FISICO' ? 'Físico' : 'Digital'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">{formatBRL(m.valor)}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-foreground/70">{m.origem}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Histórico de caixas</h2>
        <Table>
          <THead
            cols={[
              'Abertura',
              { label: 'Fechamento', className: 'hidden sm:table-cell' },
              { label: 'Situação', className: 'hidden sm:table-cell' },
              { label: 'Saldo final', className: 'text-right' },
            ]}
          />
          <tbody>
            {caixas.length === 0 && <EmptyRow colSpan={4} label="Nenhum caixa registrado." />}
            {caixas.map((c) => (
              <tr key={c.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">
                  {formatDateTime(c.dataAbertura)}
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70 whitespace-nowrap tabular-nums">
                  {formatDateTime(c.dataFechamento)}
                </td>
                <td className="hidden sm:table-cell px-4 py-3">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  {c.status === 'FECHADO'
                    ? formatBRL((c.saldoFisicoFechamento ?? 0) + (c.saldoDigitalFechamento ?? 0))
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* Abrir caixa */}
      <Modal open={abrirOpen} title="Abrir caixa" onClose={() => setAbrirOpen(false)}>
        <form onSubmit={submitAbrir} noValidate className="flex flex-col gap-4">
          {erroModal && <p className="text-sm text-danger">{erroModal}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo físico inicial (R$)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={abrirForm.fisico}
                onChange={(e) => {
                  const valor = mascaraMoeda(e.target.value);
                  setAbrirForm({ ...abrirForm, fisico: valor });
                  setAbrirErros((prev) => ({ ...prev, fisico: validarSaldoInput(valor) }));
                }}
                className={classeBordaCampo(abrirErros.fisico, abrirForm.fisico)}
              />
              {abrirErros.fisico && <p className="text-xs text-danger">{abrirErros.fisico}</p>}
            </Field>
            <Field label="Saldo digital inicial (R$)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={abrirForm.digital}
                onChange={(e) => {
                  const valor = mascaraMoeda(e.target.value);
                  setAbrirForm({ ...abrirForm, digital: valor });
                  setAbrirErros((prev) => ({ ...prev, digital: validarSaldoInput(valor) }));
                }}
                className={classeBordaCampo(abrirErros.digital, abrirForm.digital)}
              />
              {abrirErros.digital && <p className="text-xs text-danger">{abrirErros.digital}</p>}
            </Field>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setAbrirOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={enviando}>
              {enviando ? 'Abrindo...' : 'Abrir caixa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Registrar movimentação */}
      <Modal open={movOpen} title="Registrar movimentação" onClose={() => setMovOpen(false)}>
        <form onSubmit={submitMovimentacao} noValidate className="flex flex-col gap-4">
          {erroModal && <p className="text-sm text-danger">{erroModal}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tipo">
              <Select
                value={movForm.tipo}
                onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as TipoMovimentacao })}
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>
            </Field>
            <Field label="Forma">
              <Select
                value={movForm.formaPag}
                onChange={(e) => setMovForm({ ...movForm, formaPag: e.target.value as FormaPag })}
              >
                <option value="FISICO">Físico</option>
                <option value="DIGITAL">Digital</option>
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={movForm.valor}
                onChange={(e) => {
                  const valor = mascaraMoeda(e.target.value);
                  setMovForm({ ...movForm, valor });
                  setMovErros((prev) => ({ ...prev, valor: validarValorMovimentacaoInput(valor) }));
                }}
                className={classeBordaCampo(movErros.valor, movForm.valor)}
              />
              {movErros.valor && <p className="text-xs text-danger">{movErros.valor}</p>}
            </Field>
          </div>
          <Field label="Origem / observação">
            <Input
              placeholder="ex: compra de alimentos, doação avulsa..."
              value={movForm.origem}
              onChange={(e) => {
                const origem = e.target.value;
                setMovForm({ ...movForm, origem });
                setMovErros((prev) => ({
                  ...prev,
                  origem: origem.trim() ? null : 'Informe a origem da movimentação.',
                }));
              }}
              className={classeBordaCampo(movErros.origem, movForm.origem)}
            />
            {movErros.origem && <p className="text-xs text-danger">{movErros.origem}</p>}
          </Field>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setMovOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Fechar caixa */}
      <Modal open={fecharOpen} title="Fechar caixa" onClose={() => setFecharOpen(false)}>
        <form onSubmit={submitFechar} noValidate className="flex flex-col gap-4">
          {erroModal && <p className="text-sm text-danger">{erroModal}</p>}
          <p className="text-sm text-foreground/70">
            Saldo calculado: <strong className="font-medium text-foreground">{formatBRL(saldoAtual)}</strong>{' '}
            (Físico {formatBRL(saldoFisicoAtual)} · Digital {formatBRL(saldoDigitalAtual)}).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo físico final (R$)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={fecharForm.fisico}
                onChange={(e) => {
                  const valor = mascaraMoeda(e.target.value);
                  setDivergencia(null);
                  setFecharForm({ ...fecharForm, fisico: valor });
                  setFecharErros((prev) => ({ ...prev, fisico: validarSaldoInput(valor) }));
                }}
                className={classeBordaCampo(fecharErros.fisico, fecharForm.fisico)}
              />
              {fecharErros.fisico && <p className="text-xs text-danger">{fecharErros.fisico}</p>}
            </Field>
            <Field label="Saldo digital final (R$)">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={fecharForm.digital}
                onChange={(e) => {
                  const valor = mascaraMoeda(e.target.value);
                  setDivergencia(null);
                  setFecharForm({ ...fecharForm, digital: valor });
                  setFecharErros((prev) => ({ ...prev, digital: validarSaldoInput(valor) }));
                }}
                className={classeBordaCampo(fecharErros.digital, fecharForm.digital)}
              />
              {fecharErros.digital && <p className="text-xs text-danger">{fecharErros.digital}</p>}
            </Field>
          </div>

          {divergencia && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs flex flex-col gap-2">
              <p className="font-medium text-foreground">Divergência identificada:</p>
              <p>
                Físico — Esperado: {formatBRL(divergencia.esperado.fisico)} | Informado:{' '}
                {formatBRL(divergencia.informado.fisico)} | Diferença: {formatBRL(divergencia.diferenca.fisico)}
              </p>
              <p>
                Digital — Esperado: {formatBRL(divergencia.esperado.digital)} | Informado:{' '}
                {formatBRL(divergencia.informado.digital)} | Diferença: {formatBRL(divergencia.diferenca.digital)}
              </p>
              <Field label="Justificativa para fechamento com ressalva *">
                <Input
                  placeholder="Descreva o motivo da divergência..."
                  value={fecharForm.justificativa}
                  onChange={(e) => {
                    const justificativa = e.target.value;
                    setFecharForm({ ...fecharForm, justificativa });
                    setFecharErros((prev) => ({
                      ...prev,
                      justificativa: justificativa.trim()
                        ? null
                        : 'Informe a justificativa para confirmar com ressalva.',
                    }));
                  }}
                  className={classeBordaCampo(fecharErros.justificativa, fecharForm.justificativa)}
                />
                {fecharErros.justificativa && (
                  <p className="text-xs text-danger">{fecharErros.justificativa}</p>
                )}
              </Field>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={() => setFecharOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={enviando}>
              {enviando ? 'Fechando...' : divergencia ? 'Confirmar com ressalva' : 'Fechar caixa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
