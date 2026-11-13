// Testes de integração + segurança do RF_B1 (Gerenciar atendidos), com PostgreSQL de verdade.
// Passam pelas ROTAS (View -> rota -> Controller -> Model -> DAO -> banco).
// Só rodam com TEST_DATABASE_URL definida (veja test-utils/bancoDeTeste.ts).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rotas = {
  lista: typeof import('../app/api/atendidos/route');
  item: typeof import('../app/api/atendidos/[id]/route');
};
let rotas: Rotas;
let limpar: () => Promise<void>;
let schema: string;

const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://x/api/atendidos', { method: metodo, body: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } });
const crua = (texto: string, metodo = 'POST') =>
  new Request('http://x/api/atendidos', metodo === 'GET' || metodo === 'DELETE' ? { method: metodo } : { method: metodo, body: texto });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (qs = '') => rotas.lista.GET(new Request(`http://x/api/atendidos${qs}`));

const maria = { nome: 'Maria da Silva', dataNascimento: '10/05/2015', sexo: 'Feminino', responsavelLegal: 'Ana Silva' };

async function contar(): Promise<number> {
  const { Database } = await import('./db/Database');
  const r = await Database.getInstancia().query<{ n: string }>('SELECT count(*) AS n FROM atendido');
  return Number(r.rows[0].n);
}

describe.skipIf(!TEM_BANCO_DE_TESTE)('Atendidos - integração (PostgreSQL)', () => {
  beforeAll(async () => {
    ({ limpar, schema } = await prepararBancoDeTeste());
    rotas = {
      lista: await import('../app/api/atendidos/route'),
      item: await import('../app/api/atendidos/[id]/route'),
    };
  });
  afterAll(async () => {
    const { Database } = await import('./db/Database');
    await limpar();
  });

  describe('conexão', () => {
    it('o Singleton do Database usa o schema de teste (não toca nos dados reais)', async () => {
      const { Database } = await import('./db/Database');
      const r = await Database.getInstancia().query<{ s: string }>('SELECT current_schema() AS s');
      expect(r.rows[0].s).toBe(schema);
    });
  });

  describe('CRUD (fluxo básico)', () => {
    let id: number;

    it('cadastra (201) e devolve data em aaaa-mm-dd', async () => {
      const r = await rotas.lista.POST(json(maria));
      expect(r.status).toBe(201);
      const corpo = await r.json();
      expect(corpo).toMatchObject({ nome: 'Maria da Silva', dataNascimento: '2015-05-10', sexo: 'Feminino', responsavelLegal: 'Ana Silva' });
      id = corpo.id;
      expect(id).toBeGreaterThan(0);
    });

    it('consulta por id', async () => {
      const r = await rotas.item.GET(crua('', 'GET'), ctx(String(id)));
      expect(r.status).toBe(200);
      expect((await r.json()).nome).toBe('Maria da Silva');
    });

    it('não deixa cadastrar duplicado (mesmo nome e data de nascimento)', async () => {
      const r = await rotas.lista.POST(json({ ...maria, nome: 'MARIA DA SILVA' }));
      expect(r.status).toBe(400);
    });

    it('altera (200) e não confunde com ela mesma na checagem de duplicidade', async () => {
      const r = await rotas.item.PUT(json({ ...maria, responsavelLegal: 'Beatriz Souza' }, 'PUT'), ctx(String(id)));
      expect(r.status).toBe(200);
      expect((await r.json()).responsavelLegal).toBe('Beatriz Souza');
    });

    it('alteração inválida não grava nada', async () => {
      const r = await rotas.item.PUT(json({ ...maria, nome: '' }, 'PUT'), ctx(String(id)));
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('nome');
      const atual = await (await rotas.item.GET(crua('', 'GET'), ctx(String(id)))).json();
      expect(atual.nome).toBe('Maria da Silva');
    });

    it('exclui (200) e depois devolve 404', async () => {
      expect((await rotas.item.DELETE(crua('', 'DELETE'), ctx(String(id)))).status).toBe(200);
      expect((await rotas.item.GET(crua('', 'GET'), ctx(String(id)))).status).toBe(404);
      expect((await rotas.item.DELETE(crua('', 'DELETE'), ctx(String(id)))).status).toBe(404);
      expect((await rotas.item.PUT(json(maria, 'PUT'), ctx(String(id)))).status).toBe(404);
    });
  });

  describe('consulta com filtros', () => {
    beforeAll(async () => {
      const hoje = new Date();
      const nasc = (anos: number) => `15/06/${hoje.getFullYear() - anos}`;
      const dados = [
        { nome: 'José Antônio', dataNascimento: nasc(8), sexo: 'Masculino', responsavelLegal: 'Pai Um' },
        { nome: 'Jose Carlos', dataNascimento: nasc(12), sexo: 'Masculino', responsavelLegal: 'Pai Dois' },
        { nome: 'Ana Paula', dataNascimento: nasc(5), sexo: 'Feminino', responsavelLegal: 'Mae Quatro' },
      ];
      for (const d of dados) expect((await rotas.lista.POST(json(d))).status).toBe(201);
      // nomes com % e _ não passam na validação; entram direto no banco só para provar que o filtro trata
      // esses símbolos como texto comum (e não como curingas do LIKE)
      const { Database } = await import('./db/Database');
      const ano = hoje.getFullYear();
      await Database.getInstancia().query(
        `INSERT INTO atendido (nome, data_nascimento, sexo, responsavel_legal) VALUES
         ('Joana 100%', $1, 'Feminino', 'Mae Tres'), ('Ana_Paula', $2, 'Feminino', 'Mae Cinco')`,
        [`${ano - 15}-06-15`, `${ano - 5}-06-15`]
      );
    });
    const nomes = async (qs: string) => ((await (await get(qs)).json()) as { nome: string }[]).map((a) => a.nome).sort();

    it('sem filtro devolve todos', async () => expect(await nomes('')).toHaveLength(5));
    it('nome ignora acento e maiúscula', async () => expect(await nomes('?nome=jose')).toEqual(['Jose Carlos', 'José Antônio']));
    it('sexo', async () => expect(await nomes('?sexo=Feminino')).toEqual(['Ana Paula', 'Ana_Paula', 'Joana 100%']));
    it('faixa de idade', async () => expect(await nomes('?idadeMinima=7&idadeMaxima=12')).toEqual(['Jose Carlos', 'José Antônio']));
    it('combinação nome + sexo + idade', async () => expect(await nomes('?nome=jo&sexo=Masculino&idadeMinima=10')).toEqual(['Jose Carlos']));
    it('curingas do LIKE (% e _) valem como texto comum', async () => {
      expect(await nomes('?nome=%25')).toEqual(['Joana 100%']);
      expect(await nomes('?nome=_')).toEqual(['Ana_Paula']);
      expect(await nomes('?nome=' + encodeURIComponent('%%%'))).toEqual([]);
    });
  });

  describe('segurança', () => {
    const INJECOES = [
      "Robert'); DROP TABLE atendido;--",
      "' OR '1'='1",
      "1; DELETE FROM atendido",
      '" OR ""="',
      "\\'; SELECT pg_sleep(5);--",
    ];

    it.each(INJECOES)('injeção de SQL no cadastro é recusada: %s', async (nome) => {
      const antes = await contar();
      const r = await rotas.lista.POST(json({ ...maria, nome, dataNascimento: '01/01/2010' }));
      expect(r.status).toBe(400);
      expect(await contar()).toBe(antes);
    });

    it.each(INJECOES)('injeção de SQL no filtro de nome não vaza nem apaga nada: %s', async (nome) => {
      const antes = await contar();
      const r = await get('?nome=' + encodeURIComponent(nome));
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual([]);
      expect(await contar()).toBe(antes);
    });

    it('a tabela continua existindo depois de todas as tentativas', async () => {
      expect(await contar()).toBeGreaterThan(0);
    });

    it.each(['abc', '1 OR 1=1', '-1', '0', '1.5', '99999999999', '1e3', '%00', 'NaN', ''])('id inválido na URL "%s" → 404 (nunca 500)', async (id) => {
      for (const [metodo, fn] of [
        ['GET', () => rotas.item.GET(crua('', 'GET'), ctx(id))],
        ['PUT', () => rotas.item.PUT(json(maria, 'PUT'), ctx(id))],
        ['DELETE', () => rotas.item.DELETE(crua('', 'DELETE'), ctx(id))],
      ] as const) {
        const r = await fn();
        expect([404], `${metodo} ${id}`).toContain(r.status);
      }
    });

    it.each(['idadeMinima', 'idadeMaxima'])('%s com lixo → 400', async (campo) => {
      for (const v of ['abc', '1 OR 1=1', '-3', '1.5', '99999999999999999999']) {
        expect((await get(`?${campo}=${encodeURIComponent(v)}`)).status).toBe(400);
      }
    });

    it('sexo fora da lista no filtro → resultado vazio ou 400, nunca 500', async () => {
      const r = await get('?sexo=' + encodeURIComponent("x' OR '1'='1"));
      expect(r.status).toBeLessThan(500);
    });

    it.each([
      ['JSON quebrado', '{"nome": '],
      ['corpo vazio', ''],
      ['array', '[1,2,3]'],
      ['null', 'null'],
      ['string', '"oi"'],
      ['número', '42'],
    ])('corpo inválido (%s) → 400', async (_n, corpo) => {
      expect((await rotas.lista.POST(crua(corpo))).status).toBe(400);
      expect((await rotas.item.PUT(crua(corpo, 'PUT'), ctx('1'))).status).toBeLessThan(500);
    });

    it('tipos errados dentro do JSON → 400, sem 500', async () => {
      for (const corpo of [
        { nome: 123, dataNascimento: {}, sexo: null, responsavelLegal: [] },
        { nome: ['a', 'b'], dataNascimento: 20150101, sexo: true, responsavelLegal: { x: 1 } },
        { ...maria, nome: { toString: 'x' } },
        { __proto__: { admin: true }, ...maria, id: 1, dataCadastro: '2000-01-01' },
      ]) {
        const r = await rotas.lista.POST(json(corpo));
        expect(r.status, JSON.stringify(corpo)).toBeLessThan(500);
      }
    });

    it('campos extras (id, dataCadastro) enviados pelo cliente são ignorados', async () => {
      const r = await rotas.lista.POST(json({ ...maria, nome: 'Carla Extra', dataNascimento: '02/02/2012', id: 1, dataCadastro: '1999-01-01' }));
      expect(r.status).toBe(201);
      const corpo = await r.json();
      expect(corpo.id).not.toBe(1);
      expect(String(corpo.dataCadastro).startsWith('1999')).toBe(false);
    });

    it('rejeita texto gigante e byte nulo sem derrubar o servidor', async () => {
      expect((await rotas.lista.POST(json({ ...maria, nome: 'A'.repeat(100_000), dataNascimento: '03/03/2012' }))).status).toBe(400);
      expect((await rotas.lista.POST(json({ ...maria, nome: 'Maria\u0000Evil', dataNascimento: '03/03/2012' }))).status).toBe(400);
    });

    it('JavaScript no nome é recusado (XSS armazenado)', async () => {
      const r = await rotas.lista.POST(json({ ...maria, nome: '<img src=x onerror=alert(1)>', dataNascimento: '04/04/2012' }));
      expect(r.status).toBe(400);
    });

    it('erro do banco não vaza detalhes (500 genérico)', async () => {
      const { Database } = await import('./db/Database');
      const banco = Database.getInstancia();
      const original = banco.query.bind(banco);
      const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
      banco.query = (async () => {
        throw new Error('relation "atendido" password=segredo host=10.0.0.5');
      }) as typeof banco.query;
      try {
        const r = await get('');
        expect(r.status).toBe(500);
        const texto = await r.text();
        expect(texto).not.toMatch(/segredo|10\.0\.0\.5|relation/);
      } finally {
        banco.query = original;
        silencio.mockRestore();
      }
    });
  });
});
