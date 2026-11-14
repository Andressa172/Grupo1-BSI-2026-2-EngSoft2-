// Testes de integração do RF_B4 (Gerenciar Doadores), com PostgreSQL de verdade.
// Passam pelas ROTAS (View -> rota -> Controller -> Model -> DAO -> banco).
// Só rodam com TEST_DATABASE_URL definida (veja test-utils/bancoDeTeste.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rotas = {
  lista: typeof import('../app/api/doadores/route');
  item: typeof import('../app/api/doadores/[id]/route');
};
let rotas: Rotas;
let limpar: () => Promise<void>;

const CPF_VALIDO = '52998224725';
const CPF_VALIDO_2 = '12345678909';
const CONTATO_VALIDO = { telefone: '(18) 99999-1234', email: 'maria@gmail.com', cpfCnpj: CPF_VALIDO };

const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://x/api/doadores', { method: metodo, body: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } });
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const get = (qs = '') => rotas.lista.GET(new Request(`http://x/api/doadores${qs}`));
const post = (corpo: unknown) => rotas.lista.POST(json(corpo));
const put = (id: number, corpo: unknown) => rotas.item.PUT(json(corpo, 'PUT'), ctx(id));
const del = (id: number) => rotas.item.DELETE(new Request('http://x', { method: 'DELETE' }), ctx(id));

async function contar(): Promise<number> {
  const { Database } = await import('./db/Database');
  const r = await Database.getInstancia().query<{ n: string }>('SELECT count(*) AS n FROM doador');
  return Number(r.rows[0].n);
}

describe.skipIf(!TEM_BANCO_DE_TESTE)('Doadores - integração (PostgreSQL)', () => {
  beforeAll(async () => {
    ({ limpar } = await prepararBancoDeTeste());
    rotas = {
      lista: await import('../app/api/doadores/route'),
      item: await import('../app/api/doadores/[id]/route'),
    };
  });
  afterAll(async () => {
    await limpar();
  });

  it('cadastra um doador válido', async () => {
    const r = await post({ nome: 'Maria Aparecida', ...CONTATO_VALIDO });
    expect(r.status).toBe(201);
    const corpo = await r.json();
    expect(corpo.id).toBeDefined();
    expect(corpo.nome).toBe('Maria Aparecida');
    expect(await contar()).toBe(1);
  });

  it('rejeita cadastro com nome em branco', async () => {
    const r = await post({ nome: '', ...CONTATO_VALIDO });
    expect(r.status).toBe(400);
  });

  it('rejeita cadastro sem CPF/CNPJ (exigido pelo modelo Pessoa do MER)', async () => {
    const r = await post({ nome: 'Maria', telefone: CONTATO_VALIDO.telefone, email: CONTATO_VALIDO.email });
    expect(r.status).toBe(400);
  });

  it('permite cadastrar nome duplicado (duas pessoas podem ter o mesmo nome)', async () => {
    await post({ nome: 'João', ...CONTATO_VALIDO, cpfCnpj: '11144477735' });
    const r = await post({ nome: 'João', ...CONTATO_VALIDO, cpfCnpj: '35566393861' });
    expect(r.status).toBe(201);
  });

  it('rejeita cadastro com CPF/CNPJ duplicado', async () => {
    await post({ nome: 'Pedro', ...CONTATO_VALIDO, cpfCnpj: '15350946056' });
    const r = await post({ nome: 'Outro Pedro', ...CONTATO_VALIDO, cpfCnpj: '15350946056' });
    expect(r.status).toBe(400);
  });

  it('permite cadastrar o primeiro doador anônimo e rejeita um segundo', async () => {
    const r1 = await post({ nome: '', anonimo: true });
    expect(r1.status).toBe(201);
    const r2 = await post({ nome: '', anonimo: true });
    expect(r2.status).toBe(400);
  });

  it('lista e busca por id', async () => {
    const criado = await (await post({ nome: 'Ana Souza', ...CONTATO_VALIDO, cpfCnpj: '81101269952' })).json();

    const lista = await (await get()).json();
    expect(lista.some((d: { id: number }) => d.id === criado.id)).toBe(true);

    const r = await rotas.item.GET(new Request('http://x'), ctx(criado.id));
    expect(r.status).toBe(200);
    const encontrado = await r.json();
    expect(encontrado.nome).toBe('Ana Souza');
  });

  it('retorna 404 ao buscar id inexistente', async () => {
    const r = await rotas.item.GET(new Request('http://x'), ctx(999999));
    expect(r.status).toBe(404);
  });

  it('edita um doador existente', async () => {
    const criado = await (await post({ nome: 'Carlos', ...CONTATO_VALIDO, cpfCnpj: '64867682152' })).json();
    const r = await put(criado.id, { nome: 'Carlos Eduardo', ...CONTATO_VALIDO, cpfCnpj: '64867682152', telefone: '(18) 98888-0000' });
    expect(r.status).toBe(200);
    const editado = await r.json();
    expect(editado.nome).toBe('Carlos Eduardo');
    expect(editado.telefone).toBe('(18) 98888-0000');
  });

  it('rejeita edição que duplicaria o CPF/CNPJ de outro doador', async () => {
    await post({ nome: 'Doador 1', ...CONTATO_VALIDO, cpfCnpj: '49584102958' });
    const doador2 = await (await post({ nome: 'Doador 2', ...CONTATO_VALIDO, cpfCnpj: '65715366097' })).json();
    const r = await put(doador2.id, { nome: 'Doador 2', ...CONTATO_VALIDO, cpfCnpj: '49584102958' });
    expect(r.status).toBe(400);
  });

  it('retorna 404 ao editar id inexistente', async () => {
    const r = await put(999999, { nome: 'Qualquer', ...CONTATO_VALIDO, cpfCnpj: '13501723326' });
    expect(r.status).toBe(404);
  });

  it('exclui um doador existente', async () => {
    const criado = await (await post({ nome: 'Fernanda', ...CONTATO_VALIDO, cpfCnpj: '71500914746' })).json();
    const r = await del(criado.id);
    expect(r.status).toBe(200);
    expect((await rotas.item.GET(new Request('http://x'), ctx(criado.id))).status).toBe(404);
  });

  it('retorna 404 ao excluir id inexistente', async () => {
    const r = await del(999999);
    expect(r.status).toBe(404);
  });

  it('rejeita exclusão de doador que já possui doação registrada (FK)', async () => {
    const criado = await (await post({ nome: 'Lucas', ...CONTATO_VALIDO, cpfCnpj: '47868631651' })).json();
    const { Database } = await import('./db/Database');
    await Database.getInstancia().query('INSERT INTO doacao_produto (doador_id) VALUES ($1)', [criado.id]);
    const r = await del(criado.id);
    expect(r.status).toBe(400);
  });
});
