// Testes unitários e de integração (PostgreSQL) para RF_F7 (Abrir cotação) e RF_F8 (Aprovar cotação).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';
import { Cotacao } from './model/Cotacao';
import { podeVisualizarItem, type NavItem } from '@/components/app/AppShell';

type RotasCotacoes = {
  lista: typeof import('../app/api/cotacoes/route');
  porId: typeof import('../app/api/cotacoes/[id]/route');
};

let rotas: RotasCotacoes;
let limpar: () => Promise<void>;

const post = (corpo: unknown) =>
  new Request('http://x/api/cotacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

const patch = (id: string | number, corpo: unknown) =>
  new Request(`http://x/api/cotacoes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

const ctx = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) });

async function sql<T extends Record<string, unknown>>(texto: string, p: unknown[] = []): Promise<T[]> {
  const { Database } = await import('./db/Database');
  return (await Database.getInstancia().query(texto, p)).rows as T[];
}

describe('Unidade - Cotacao e Hierarquia de Menu (RF_F7 e RF_F8)', () => {
  it('menu Cotações permite SECRETARIO e GERENTE, mas bloqueia FUNCIONARIO', () => {
    const itemCotacoes: NavItem = {
      href: '/cotacoes',
      label: 'Cotações',
      icon: (() => null) as unknown as NavItem['icon'],
      perfisPermitidos: ['SECRETARIO', 'GERENTE'],
    };
    expect(podeVisualizarItem(itemCotacoes, 'SECRETARIO')).toBe(true);
    expect(podeVisualizarItem(itemCotacoes, 'GERENTE')).toBe(true);
    expect(podeVisualizarItem(itemCotacoes, 'FUNCIONARIO')).toBe(false);
    expect(podeVisualizarItem(itemCotacoes, undefined)).toBe(false);
  });

  it('RF_F7 Fluxo Alternativo 1.1: destaca descrição ausente, data de abertura inválida e data limite anterior', () => {
    const cotacao = new Cotacao({
      descricao: '   ',
      dataAbertura: '31/02/2026',
      dataLimite: '01/01/2026',
      abertaPor: 1,
      itens: [],
    });
    const erros = cotacao.validarDados();
    expect(erros.descricao).toMatch(/Descrição não preenchida/i);
    expect(erros.dataAbertura).toMatch(/Data de abertura inválida/i);
    expect(erros.itens).toBeDefined();

    const cotacaoLimiteAnterior = new Cotacao({
      descricao: 'Compra mensal',
      dataAbertura: '2026-05-10',
      dataLimite: '2026-05-01',
      abertaPor: 1,
      itens: [{ produtoId: 1, quantidadeDesejada: 5 }],
    });
    expect(cotacaoLimiteAnterior.validarAbertura().dataLimite).toMatch(/anterior à data de abertura/i);
  });

  it('RF_F8 Fluxo Básico vs Fluxo Alternativo 3.1: justificativa é opcional ao APROVAR e obrigatória ao REPROVAR', () => {
    const aprovacaoSemJustificativa = new Cotacao({
      status: 'APROVADA',
      avaliadaPor: 1,
      justificativa: '',
    });
    expect(aprovacaoSemJustificativa.validarAvaliacao()).toEqual({});

    const reprovacaoSemJustificativa = new Cotacao({
      status: 'REPROVADA',
      avaliadaPor: 1,
      justificativa: '   ',
    });
    expect(reprovacaoSemJustificativa.validarAvaliacao().justificativa).toMatch(/obrigatória/i);

    const reprovacaoComJustificativa = new Cotacao({
      status: 'REPROVADA',
      avaliadaPor: 1,
      justificativa: 'Orçamento insuficiente neste mês.',
    });
    expect(reprovacaoComJustificativa.validarAvaliacao()).toEqual({});
  });
});

describe.skipIf(!TEM_BANCO_DE_TESTE)('Cotações (RF_F7 e RF_F8) - integração (PostgreSQL)', () => {
  let secretarioId: number;
  let gerenteId: number;
  let funcionarioId: number;
  let arrozId: number;
  let feijaoId: number;

  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rotas = {
      lista: await import('../app/api/cotacoes/route'),
      porId: await import('../app/api/cotacoes/[id]/route'),
    };

    secretarioId = (
      await sql<{ id: number }>(
        "INSERT INTO usuario (nome, login, senha_hash, perfil, cpf, ativo) VALUES ('Secretário Teste', 'sec_cot', 'demo', 'SECRETARIO', '11144477735', TRUE) RETURNING id"
      )
    )[0].id;

    gerenteId = (
      await sql<{ id: number }>(
        "INSERT INTO usuario (nome, login, senha_hash, perfil, cpf, ativo) VALUES ('Gerente Teste', 'ger_cot', 'demo', 'GERENTE', '52998224725', TRUE) RETURNING id"
      )
    )[0].id;

    funcionarioId = (
      await sql<{ id: number }>(
        "INSERT INTO usuario (nome, login, senha_hash, perfil, cpf, ativo) VALUES ('Funcionário Teste', 'func_cot', 'demo', 'FUNCIONARIO', '12345678909', TRUE) RETURNING id"
      )
    )[0].id;

    arrozId = (
      await sql<{ id: number }>(
        "INSERT INTO produto (nome, categoria, unidade_medida, quantidade_estoque) VALUES ('Arroz 5kg', 'Alimento', 'pacote', 10) RETURNING id"
      )
    )[0].id;

    feijaoId = (
      await sql<{ id: number }>(
        "INSERT INTO produto (nome, categoria, unidade_medida, quantidade_estoque) VALUES ('Feijão 1kg', 'Alimento', 'pacote', 8) RETURNING id"
      )
    )[0].id;
  });

  afterAll(async () => {
    await limpar();
  });

  describe('RF_F7 - Abrir cotação', () => {
    it('fluxo básico: Secretário abre cotação com descrição, data de abertura, data limite e itens (status PENDENTE)', async () => {
      const r = await rotas.lista.POST(
        post({
          descricao: 'Reposição quinzenal de despensa',
          dataAbertura: '2026-04-10',
          dataLimite: '2026-04-20',
          abertaPor: secretarioId,
          itens: [
            { produtoId: arrozId, quantidadeDesejada: 15 },
            { produtoId: feijaoId, quantidadeDesejada: 25 },
          ],
        })
      );
      expect(r.status).toBe(201);
      const corpo = await r.json();
      expect(corpo.id).toBeGreaterThan(0);
      expect(corpo.status).toBe('PENDENTE');
      expect(corpo.descricao).toBe('Reposição quinzenal de despensa');
      expect(corpo.dataAbertura).toBe('2026-04-10');
      expect(corpo.dataLimite).toBe('2026-04-20');
      expect(corpo.abertaPor).toBe(secretarioId);
      expect(corpo.itens).toHaveLength(2);
    });

    it('hierarquia de acesso: impede que Gerente ou Funcionário abra cotação (exclusivo de Secretário)', async () => {
      const rGerente = await rotas.lista.POST(
        post({
          descricao: 'Tentativa pelo gerente',
          dataAbertura: '2026-04-10',
          abertaPor: gerenteId,
          itens: [{ produtoId: arrozId, quantidadeDesejada: 5 }],
        })
      );
      expect(rGerente.status).toBe(400);
      const corpoGerente = await rGerente.json();
      expect(corpoGerente.erro).toMatch(/Secretário/i);

      const rFunc = await rotas.lista.POST(
        post({
          descricao: 'Tentativa pelo funcionário',
          dataAbertura: '2026-04-10',
          abertaPor: funcionarioId,
          itens: [{ produtoId: arrozId, quantidadeDesejada: 5 }],
        })
      );
      expect(rFunc.status).toBe(400);
    });

    it('fluxo alternativo 3.1: produto não cadastrado desfaz a transação inteira (nenhum cabeçalho órfão)', async () => {
      const antes = Number((await sql<{ n: string }>('SELECT count(*) AS n FROM cotacao'))[0].n);

      const r = await rotas.lista.POST(
        post({
          descricao: 'Cotação com produto inexistente',
          dataAbertura: '2026-04-12',
          abertaPor: secretarioId,
          itens: [
            { produtoId: arrozId, quantidadeDesejada: 10 },
            { produtoId: 999999, quantidadeDesejada: 5 },
          ],
        })
      );
      expect(r.status).toBe(400);
      const corpo = await r.json();
      expect(corpo.erros['itens.1.produto']).toMatch(/Produto não cadastrado/i);

      const depois = Number((await sql<{ n: string }>('SELECT count(*) AS n FROM cotacao'))[0].n);
      expect(depois).toBe(antes);
    });
  });

  describe('RF_F8 - Aprovar cotação', () => {
    it('fluxo básico: Gerente aprova cotação pendente (com ou sem justificativa)', async () => {
      const aberta = await (
        await rotas.lista.POST(
          post({
            descricao: 'Cotação para aprovar',
            dataAbertura: '2026-04-11',
            abertaPor: secretarioId,
            itens: [{ produtoId: arrozId, quantidadeDesejada: 12 }],
          })
        )
      ).json();

      const r = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'APROVADA',
          avaliadaPor: gerenteId,
          justificativa: 'Aprovada conforme orçamento.',
        }),
        ctx(aberta.id)
      );
      expect(r.status).toBe(200);
      const avaliada = await r.json();
      expect(avaliada.status).toBe('APROVADA');
      expect(avaliada.avaliadaPor).toBe(gerenteId);
      expect(avaliada.justificativa).toBe('Aprovada conforme orçamento.');
    });

    it('fluxo alternativo 3.1: Gerente reprova cotação exigindo justificativa obrigatória', async () => {
      const aberta = await (
        await rotas.lista.POST(
          post({
            descricao: 'Cotação para reprovar',
            dataAbertura: '2026-04-11',
            abertaPor: secretarioId,
            itens: [{ produtoId: feijaoId, quantidadeDesejada: 40 }],
          })
        )
      ).json();

      // Sem justificativa -> erro 400
      const semJustificativa = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'REPROVADA',
          avaliadaPor: gerenteId,
          justificativa: '',
        }),
        ctx(aberta.id)
      );
      expect(semJustificativa.status).toBe(400);

      // Com justificativa -> 200 REPROVADA
      const comJustificativa = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'REPROVADA',
          avaliadaPor: gerenteId,
          justificativa: 'Estoque atual ainda é suficiente.',
        }),
        ctx(aberta.id)
      );
      expect(comJustificativa.status).toBe(200);
      const reprovada = await comJustificativa.json();
      expect(reprovada.status).toBe('REPROVADA');
      expect(reprovada.justificativa).toBe('Estoque atual ainda é suficiente.');
    });

    it('hierarquia e regras: Secretário não pode aprovar/reprovar e cotação já avaliada não pode ser reavaliada', async () => {
      const aberta = await (
        await rotas.lista.POST(
          post({
            descricao: 'Cotação teste bloqueio',
            dataAbertura: '2026-04-11',
            abertaPor: secretarioId,
            itens: [{ produtoId: arrozId, quantidadeDesejada: 5 }],
          })
        )
      ).json();

      // Secretário tentando aprovar -> 400
      const rSec = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'APROVADA',
          avaliadaPor: secretarioId,
        }),
        ctx(aberta.id)
      );
      expect(rSec.status).toBe(400);

      // Gerente aprova -> 200
      const rGer = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'APROVADA',
          avaliadaPor: gerenteId,
        }),
        ctx(aberta.id)
      );
      expect(rGer.status).toBe(200);

      // Tentativa de avaliar novamente -> 400
      const rReavaliar = await rotas.porId.PATCH(
        patch(aberta.id, {
          status: 'REPROVADA',
          avaliadaPor: gerenteId,
          justificativa: 'Mudança de ideia',
        }),
        ctx(aberta.id)
      );
      expect(rReavaliar.status).toBe(400);
    });

    it('fluxo alternativo 1.1: retorna 404 ao buscar ou avaliar cotação inexistente', async () => {
      const rGet = await rotas.porId.GET(new Request('http://x/api/cotacoes/999999'), ctx(999999));
      expect(rGet.status).toBe(404);

      const rPatch = await rotas.porId.PATCH(
        patch(999999, { status: 'APROVADA', avaliadaPor: gerenteId }),
        ctx(999999)
      );
      expect(rPatch.status).toBe(404);
    });

    it('consulta com filtros: filtra por data de abertura, data de aprovação e itens da cotação preservando todos os itens', async () => {
      const rPorAbertura = await rotas.lista.GET(
        new Request('http://x/api/cotacoes?dataAbertura=2026-04-10')
      );
      expect(rPorAbertura.status).toBe(200);
      const listaAbertura = await rPorAbertura.json();
      expect(listaAbertura.length).toBeGreaterThanOrEqual(1);
      expect(listaAbertura.every((c: { dataAbertura: string }) => c.dataAbertura === '2026-04-10')).toBe(true);

      // Filtra por item ("Feijão") e verifica que a cotação retornada mantém todos os seus itens (Arroz + Feijão)
      const rPorItem = await rotas.lista.GET(
        new Request('http://x/api/cotacoes?item=Feij%C3%A3o&dataAbertura=2026-04-10')
      );
      expect(rPorItem.status).toBe(200);
      const listaItem = await rPorItem.json();
      expect(listaItem).toHaveLength(1);
      expect(listaItem[0].itens).toHaveLength(2);

      // Filtra por data de aprovação (CURRENT_DATE das cotações avaliadas acima)
      const hojeIso = new Date().toISOString().slice(0, 10);
      const rPorAprovacao = await rotas.lista.GET(
        new Request(`http://x/api/cotacoes?dataAprovacao=${hojeIso}`)
      );
      expect(rPorAprovacao.status).toBe(200);
      const listaAprovacao = await rPorAprovacao.json();
      expect(listaAprovacao.length).toBeGreaterThanOrEqual(1);
      expect(listaAprovacao.every((c: { dataAvaliacao: string }) => c.dataAvaliacao === hojeIso)).toBe(true);

      // Filtra por range de data de abertura (2026-04-10 até 2026-04-11)
      const rRangeAbertura = await rotas.lista.GET(
        new Request('http://x/api/cotacoes?dataAberturaInicio=2026-04-10&dataAberturaFim=2026-04-11')
      );
      expect(rRangeAbertura.status).toBe(200);
      const listaRangeAbertura = await rRangeAbertura.json();
      expect(listaRangeAbertura.length).toBeGreaterThanOrEqual(2);
      expect(
        listaRangeAbertura.every(
          (c: { dataAbertura: string }) => c.dataAbertura >= '2026-04-10' && c.dataAbertura <= '2026-04-11'
        )
      ).toBe(true);

      // Filtra por range de data de aprovação
      const rRangeAprovacao = await rotas.lista.GET(
        new Request(`http://x/api/cotacoes?dataAprovacaoInicio=${hojeIso}&dataAprovacaoFim=${hojeIso}`)
      );
      expect(rRangeAprovacao.status).toBe(200);
      const listaRangeAprovacao = await rRangeAprovacao.json();
      expect(listaRangeAprovacao.length).toBeGreaterThanOrEqual(1);

      // Range invertido retorna 400
      const rRangeInvertido = await rotas.lista.GET(
        new Request('http://x/api/cotacoes?dataAberturaInicio=2026-04-20&dataAberturaFim=2026-04-10')
      );
      expect(rRangeInvertido.status).toBe(400);
    });
  });
});
