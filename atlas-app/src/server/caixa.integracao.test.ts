// Testes de integração de RF_F6 (recurso financeiro de evento gera movimentação de caixa),
// com PostgreSQL de verdade, passando pela rota. Só rodam com TEST_DATABASE_URL definida.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

let rotaEventos: typeof import('../app/api/eventos/route');
let rotaCaixa: typeof import('../app/api/caixa/route');
let rotaAbrirCaixa: typeof import('../app/api/caixa/abrir/route');
let limpar: () => Promise<void>;

let gerenteId = 0;
const cabecalhos = (usuarioId: number | null = gerenteId): Record<string, string> =>
  usuarioId === null ? {} : { 'x-usuario-id': String(usuarioId) };

const postEvento = (corpo: unknown) =>
  rotaEventos.POST(new Request('http://x/api/eventos', { method: 'POST', body: JSON.stringify(corpo) }));
const getCaixa = () => rotaCaixa.GET();
const abrirCaixa = () =>
  rotaAbrirCaixa.POST(
    new Request('http://x/api/caixa/abrir', {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify({ saldoFisicoInicial: 0, saldoDigitalInicial: 0 }),
    })
  );

async function sql<T extends Record<string, unknown>>(texto: string, p: unknown[] = []): Promise<T[]> {
  const { Database } = await import('./db/Database');
  return (await Database.getInstancia().query(texto, p)).rows as T[];
}
async function novoUsuario(perfil: 'GERENTE'): Promise<number> {
  const [u] = await sql<{ id: number }>(
    'INSERT INTO usuario (nome, login, senha_hash, perfil, ativo) VALUES ($1, $2, $3, $4, true) RETURNING id',
    [`Usuário ${perfil}`, `caixa-${perfil}-${Date.now()}`, 'x', perfil]
  );
  return u.id;
}

let sequencia = 0;
const amanha = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const nomeEvento = () => `Evento caixa ${++sequencia}`;

describe.skipIf(!TEM_BANCO_DE_TESTE)('Eventos + Caixa - integração (PostgreSQL)', () => {
  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rotaEventos = await import('../app/api/eventos/route');
    rotaCaixa = await import('../app/api/caixa/route');
    rotaAbrirCaixa = await import('../app/api/caixa/abrir/route');
    gerenteId = await novoUsuario('GERENTE');
  });
  afterAll(async () => {
    await limpar();
  });

  it('despesa financeira vencida sem caixa aberto fica pendente (não lança nada)', async () => {
    const nome = nomeEvento();
    const r = await postEvento({
      nome,
      data: amanha(),
      recursos: [{ tipo: 'FINANCEIRO', valor: 150, dataPagamento: hojeBR(), descricao: 'Som' }],
    });
    expect(r.status).toBe(201);

    const estado = await (await getCaixa()).json();
    expect(estado.caixaAberto).toBeNull();
    expect(estado.despesasEventosPendentes.some((d: { eventoNome: string }) => d.eventoNome === nome)).toBe(true);
  });

  it('abrir caixa lança automaticamente a despesa que já venceu, e some da lista de pendentes', async () => {
    const abertura = await abrirCaixa();
    expect(abertura.status).toBe(201);

    const estado = await (await getCaixa()).json();
    expect(estado.caixaAberto).not.toBeNull();
    const movimentacoes = estado.caixaAberto.movimentacoes as { origem: string; tipo: string; valor: number }[];
    expect(movimentacoes.some((m) => m.tipo === 'SAIDA' && m.valor === 150)).toBe(true);
    expect(estado.despesasEventosPendentes).toHaveLength(0);
  });

  it('despesa financeira com data de pagamento futura fica pendente e não lança no caixa', async () => {
    const nome = nomeEvento();
    const antesMovs = (await (await getCaixa()).json()).caixaAberto.movimentacoes.length;
    const r = await postEvento({
      nome,
      data: amanha(),
      recursos: [{ tipo: 'FINANCEIRO', valor: 300, dataPagamento: amanha() }],
    });
    expect(r.status).toBe(201);

    const estado = await (await getCaixa()).json();
    expect(estado.caixaAberto.movimentacoes).toHaveLength(antesMovs);
    expect(estado.despesasEventosPendentes.some((d: { eventoNome: string }) => d.eventoNome === nome)).toBe(true);
  });

  it('despesa financeira vencida com caixa já aberto lança na hora (sem precisar de outra consulta)', async () => {
    const nome = nomeEvento();
    const r = await postEvento({
      nome,
      data: amanha(),
      recursos: [{ tipo: 'FINANCEIRO', valor: 75, dataPagamento: hojeBR() }],
    });
    expect(r.status).toBe(201);

    const movs = await sql<{ origem: string; tipo: string; valor: string }>(
      "SELECT origem, tipo, valor FROM movimentacao_caixa WHERE origem LIKE $1",
      [`%${nome}%`]
    );
    expect(movs).toHaveLength(1);
    expect(movs[0].tipo).toBe('SAIDA');
    expect(Number(movs[0].valor)).toBe(75);
  });
});
