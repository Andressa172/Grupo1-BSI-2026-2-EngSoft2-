// Testes de integração do login e do CRUD de funcionários (RF_B2), com PostgreSQL de verdade.
// Passam pelas ROTAS (View -> rota -> Controller -> Model -> DAO -> banco).
// Só rodam com TEST_DATABASE_URL definida (veja test-utils/bancoDeTeste.ts).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepararBancoDeTeste, TEM_BANCO_DE_TESTE } from './test-utils/bancoDeTeste';

type Rotas = {
  auth: typeof import('../app/api/auth/route');
  lista: typeof import('../app/api/usuarios/route');
  item: typeof import('../app/api/usuarios/[id]/route');
};
let rotas: Rotas;
let limpar: () => Promise<void>;
let schema: string;

const json = (corpo: unknown, metodo = 'POST') =>
  new Request('http://x/api/usuarios', { method: metodo, body: JSON.stringify(corpo), headers: { 'content-type': 'application/json' } });
const crua = (texto: string, metodo = 'POST') =>
  new Request('http://x/api/usuarios', metodo === 'GET' || metodo === 'DELETE' ? { method: metodo } : { method: metodo, body: texto });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const listar = (qs = '') => rotas.lista.GET(new Request(`http://x/api/usuarios${qs}`));
const logar = (login: unknown, senha: unknown) => rotas.auth.POST(json({ login, senha }));

// CPFs válidos (dígitos verificadores corretos)
const CPF_ADM = '529.982.247-25';
const CPF_B = '111.444.777-35';
const CPF_C = '123.456.789-09';
const CPF_D = '935.411.347-80';

const adm = { nome: 'Gerente Principal', login: 'gerente', senha: 'demo', perfil: 'GERENTE', cpf: CPF_ADM };
const func = { nome: 'Funcionario Teste', login: 'func1', senha: 'abc123', perfil: 'FUNCIONARIO', cpf: CPF_B };

async function cadastrar(dados: Record<string, unknown>): Promise<{ id: number }> {
  const r = await rotas.lista.POST(json(dados));
  expect(r.status).toBe(201);
  return r.json();
}

describe.skipIf(!TEM_BANCO_DE_TESTE)('Usuários / login - integração (PostgreSQL)', () => {
  beforeAll(async () => {
    ({ limpar, schema } = await prepararBancoDeTeste());
    rotas = {
      auth: await import('../app/api/auth/route'),
      lista: await import('../app/api/usuarios/route'),
      item: await import('../app/api/usuarios/[id]/route'),
    };
  });
  afterAll(async () => {
    await limpar();
  });

  it('o Singleton do Database usa o schema de teste (não toca nos dados reais)', async () => {
    const { Database } = await import('./db/Database');
    const r = await Database.getInstancia().query<{ s: string }>('SELECT current_schema() AS s');
    expect(r.rows[0].s).toBe(schema);
  });

  describe('cadastro', () => {
    it('cadastra (201), guarda CPF só com dígitos, devolve CPF formatado e NUNCA devolve a senha', async () => {
      const r = await rotas.lista.POST(json(adm));
      expect(r.status).toBe(201);
      const corpo = await r.json();
      expect(corpo).toMatchObject({ nome: 'Gerente Principal', login: 'gerente', perfil: 'GERENTE', cpf: CPF_ADM, ativo: true });
      expect(corpo).not.toHaveProperty('senha');
      expect(corpo).not.toHaveProperty('senhaHash');

      const { Database } = await import('./db/Database');
      const linha = await Database.getInstancia().query<{ cpf: string }>('SELECT cpf FROM usuario WHERE login = $1', ['gerente']);
      expect(linha.rows[0].cpf).toBe('52998224725');
    });

    it('não permite dois funcionários com o mesmo login (inclusive variando maiúsculas)', async () => {
      await cadastrar(func);
      const igual = await rotas.lista.POST(json({ ...func, cpf: CPF_C }));
      expect(igual.status).toBe(400);
      expect((await igual.json()).erros).toHaveProperty('login');

      const caixaAlta = await rotas.lista.POST(json({ ...func, login: 'FUNC1', cpf: CPF_C }));
      expect(caixaAlta.status).toBe(400);
      expect((await caixaAlta.json()).erros).toHaveProperty('login');
    });

    it('não permite dois funcionários com o mesmo CPF (com ou sem máscara)', async () => {
      const comMascara = await rotas.lista.POST(json({ ...func, login: 'outro1', cpf: CPF_B }));
      expect(comMascara.status).toBe(400);
      expect((await comMascara.json()).erros).toHaveProperty('cpf');

      const semMascara = await rotas.lista.POST(json({ ...func, login: 'outro2', cpf: '11144477735' }));
      expect(semMascara.status).toBe(400);
      expect((await semMascara.json()).erros).toHaveProperty('cpf');
    });

    it('rejeita CPF inválido, vazio e com dígitos repetidos', async () => {
      for (const cpf of ['111.444.777-36', '', '000.000.000-00', '123']) {
        const r = await rotas.lista.POST(json({ ...func, login: 'cpfruim', cpf }));
        expect(r.status).toBe(400);
        expect((await r.json()).erros).toHaveProperty('cpf');
      }
    });

    it('rejeita campos obrigatórios em branco, apontando cada campo', async () => {
      const r = await rotas.lista.POST(json({ nome: '', login: '', senha: '', perfil: 'GERENTE', cpf: '' }));
      expect(r.status).toBe(400);
      const { erros } = await r.json();
      expect(Object.keys(erros).sort()).toEqual(['cpf', 'login', 'nome', 'senha']);
    });

    it('rejeita cargo inválido e login com espaços', async () => {
      const cargo = await rotas.lista.POST(json({ ...func, login: 'cargo1', cpf: CPF_C, perfil: 'DONO' }));
      expect(cargo.status).toBe(400);
      expect((await cargo.json()).erros).toHaveProperty('perfil');

      const espaco = await rotas.lista.POST(json({ ...func, login: 'com espaco', cpf: CPF_C }));
      expect(espaco.status).toBe(400);
      expect((await espaco.json()).erros).toHaveProperty('login');
    });

    it('JSON quebrado ou corpo que não é objeto vira 400 (nunca 500)', async () => {
      expect((await rotas.lista.POST(crua('{quebrado'))).status).toBe(400);
      expect((await rotas.lista.POST(json([1, 2]))).status).toBe(400);
      expect((await rotas.lista.POST(json(null))).status).toBe(400);
    });

    it('cadastro inválido não grava nada', async () => {
      const antes = await (await listar()).json();
      await rotas.lista.POST(json({ ...func, login: 'naograva', cpf: '111' }));
      expect(await (await listar()).json()).toHaveLength(antes.length);
    });
  });

  describe('login', () => {
    it('autentica com credenciais corretas e não devolve a senha', async () => {
      const r = await logar('gerente', 'demo');
      expect(r.status).toBe(200);
      const corpo = await r.json();
      expect(corpo).toMatchObject({ login: 'gerente', perfil: 'GERENTE', ativo: true });
      expect(corpo).not.toHaveProperty('senhaHash');
      expect(corpo).not.toHaveProperty('senha');
    });

    it('senha errada ou usuário inexistente: 401 com a mensagem "Usuário não encontrado."', async () => {
      for (const [login, senha] of [['gerente', 'errada'], ['fantasma', 'demo'], ["' OR 1=1 --", 'x']]) {
        const r = await logar(login, senha);
        expect(r.status).toBe(401);
        expect((await r.json()).erro).toBe('Usuário não encontrado.');
      }
    });

    it('campos vazios: 400 indicando exatamente o campo que falta', async () => {
      const soUsuario = await logar('gerente', '');
      expect(soUsuario.status).toBe(400);
      const e1 = (await soUsuario.json()).erros;
      expect(e1).toHaveProperty('senha');
      expect(e1).not.toHaveProperty('login');

      const soSenha = await logar('', 'demo');
      const e2 = (await soSenha.json()).erros;
      expect(e2).toHaveProperty('login');
      expect(e2).not.toHaveProperty('senha');

      const nenhum = await logar('', '');
      expect(Object.keys((await nenhum.json()).erros).sort()).toEqual(['login', 'senha']);
    });

    it('corpo inválido, tipos errados ou ausentes viram 400, nunca 500', async () => {
      expect((await rotas.auth.POST(crua('{quebrado'))).status).toBe(400);
      expect((await rotas.auth.POST(json(null))).status).toBe(400);
      expect((await rotas.auth.POST(json({}))).status).toBe(400);
      expect((await logar(123, { a: 1 })).status).toBe(400);
    });

    it('o login não diferencia maiúsculas/minúsculas, mas a senha diferencia', async () => {
      expect((await logar('GERENTE', 'demo')).status).toBe(200);
      expect((await logar('gerente', 'DEMO')).status).toBe(401);
    });
  });

  describe('funcionário desativado', () => {
    let id: number;
    const corpoPut = (extra: Record<string, unknown>) => ({ nome: func.nome, login: func.login, perfil: 'FUNCIONARIO', cpf: CPF_B, ...extra });

    it('funcionário ativo consegue logar', async () => {
      const lista = await (await listar('?nome=func1')).json();
      id = lista[0].id;
      expect((await logar('func1', 'abc123')).status).toBe(200);
    });

    it('depois de inativado NÃO consegue mais logar', async () => {
      const r = await rotas.item.PUT(json(corpoPut({ ativo: false }), 'PUT'), ctx(String(id)));
      expect(r.status).toBe(200);
      expect((await r.json()).ativo).toBe(false);

      const tentativa = await logar('func1', 'abc123');
      expect(tentativa.status).toBe(401);
      expect((await tentativa.json()).erro).toMatch(/inativo/i);
    });

    it('inativar sem enviar senha mantém a senha antiga', async () => {
      await rotas.item.PUT(json(corpoPut({ ativo: true }), 'PUT'), ctx(String(id)));
      expect((await logar('func1', 'abc123')).status).toBe(200);
    });

    it('inativo com senha errada continua recebendo 401', async () => {
      await rotas.item.PUT(json(corpoPut({ ativo: false }), 'PUT'), ctx(String(id)));
      expect((await logar('func1', 'errada')).status).toBe(401);
    });

    it('ao reativar, volta a conseguir logar', async () => {
      await rotas.item.PUT(json(corpoPut({ ativo: true }), 'PUT'), ctx(String(id)));
      expect((await logar('func1', 'abc123')).status).toBe(200);
    });

    it('trocar a senha invalida a antiga e vale a nova', async () => {
      await rotas.item.PUT(json(corpoPut({ senha: 'nova456' }), 'PUT'), ctx(String(id)));
      expect((await logar('func1', 'abc123')).status).toBe(401);
      expect((await logar('func1', 'nova456')).status).toBe(200);
    });
  });

  describe('consulta, alteração e exclusão', () => {
    it('lista nunca expõe a senha', async () => {
      const lista = await (await listar()).json();
      expect(lista.length).toBeGreaterThanOrEqual(2);
      for (const u of lista) {
        expect(u).not.toHaveProperty('senha');
        expect(u).not.toHaveProperty('senhaHash');
      }
    });

    it('filtra por nome/login, cargo e status', async () => {
      expect(await (await listar('?nome=func1')).json()).toHaveLength(1);
      expect(await (await listar('?nome=GERENTE')).json()).toHaveLength(1);
      const gerentes = await (await listar('?perfil=GERENTE')).json();
      expect(gerentes.every((u: { perfil: string }) => u.perfil === 'GERENTE')).toBe(true);
      const inativos = await (await listar('?status=INATIVO')).json();
      expect(inativos.every((u: { ativo: boolean }) => u.ativo === false)).toBe(true);
    });

    it('filtro inválido vira 400', async () => {
      expect((await listar('?perfil=DONO')).status).toBe(400);
      expect((await listar('?status=TALVEZ')).status).toBe(400);
    });

    it('não permite alterar o login para um que já existe, mas aceita manter o próprio', async () => {
      const outro = await cadastrar({ nome: 'Outro Func', login: 'func2', senha: '123', perfil: 'SECRETARIO', cpf: CPF_C });
      const roubo = await rotas.item.PUT(
        json({ nome: 'Outro Func', login: 'gerente', perfil: 'SECRETARIO', cpf: CPF_C }, 'PUT'),
        ctx(String(outro.id))
      );
      expect(roubo.status).toBe(400);
      expect((await roubo.json()).erros).toHaveProperty('login');

      const mesmo = await rotas.item.PUT(
        json({ nome: 'Outro Func Editado', login: 'func2', perfil: 'SECRETARIO', cpf: CPF_C }, 'PUT'),
        ctx(String(outro.id))
      );
      expect(mesmo.status).toBe(200);
      expect((await mesmo.json()).nome).toBe('Outro Func Editado');
    });

    it('não permite alterar o CPF para um que já existe', async () => {
      const lista = await (await listar('?nome=func2')).json();
      const r = await rotas.item.PUT(
        json({ nome: 'Outro Func Editado', login: 'func2', perfil: 'SECRETARIO', cpf: CPF_ADM }, 'PUT'),
        ctx(String(lista[0].id))
      );
      expect(r.status).toBe(400);
      expect((await r.json()).erros).toHaveProperty('cpf');
    });

    it('alteração inválida não grava nada', async () => {
      const lista = await (await listar('?nome=func2')).json();
      const id = lista[0].id;
      const r = await rotas.item.PUT(json({ nome: '', login: 'func2', perfil: 'SECRETARIO', cpf: CPF_C }, 'PUT'), ctx(String(id)));
      expect(r.status).toBe(400);
      const atual = await (await rotas.item.GET(crua('', 'GET'), ctx(String(id)))).json();
      expect(atual.nome).toBe('Outro Func Editado');
    });

    it('ids inválidos ou inexistentes devolvem 404 (nunca 500)', async () => {
      for (const id of ['abc', '0', '-1', '1.5', '99999999999', '999999']) {
        expect((await rotas.item.GET(crua('', 'GET'), ctx(id))).status).toBe(404);
        expect((await rotas.item.DELETE(crua('', 'DELETE'), ctx(id))).status).toBe(404);
      }
      expect((await rotas.item.PUT(json({}, 'PUT'), ctx('999999'))).status).toBe(404);
    });

    it('exclui um funcionário (200) e depois devolve 404; o login dele deixa de funcionar', async () => {
      const novo = await cadastrar({ nome: 'Para Excluir', login: 'excluir1', senha: 'x1x1', perfil: 'FUNCIONARIO', cpf: CPF_D });
      expect((await logar('excluir1', 'x1x1')).status).toBe(200);
      expect((await rotas.item.DELETE(crua('', 'DELETE'), ctx(String(novo.id)))).status).toBe(200);
      expect((await rotas.item.GET(crua('', 'GET'), ctx(String(novo.id)))).status).toBe(404);
      expect((await logar('excluir1', 'x1x1')).status).toBe(401);
    });

    it('funcionário com registros vinculados não pode ser excluído (400), mas pode ser inativado', async () => {
      const vinculado = await cadastrar({ nome: 'Com Vinculo', login: 'vinculo1', senha: 'x1x1', perfil: 'GERENTE', cpf: '390.533.447-05' });
      const { Database } = await import('./db/Database');
      await Database.getInstancia().query('INSERT INTO evento (nome, data, criado_por) VALUES ($1, now(), $2)', ['Evento X', vinculado.id]);

      const r = await rotas.item.DELETE(crua('', 'DELETE'), ctx(String(vinculado.id)));
      expect(r.status).toBe(400);
      expect((await r.json()).erro).toMatch(/vinculados/i);

      const inativar = await rotas.item.PUT(
        json({ nome: 'Com Vinculo', login: 'vinculo1', perfil: 'GERENTE', cpf: '390.533.447-05', ativo: false }, 'PUT'),
        ctx(String(vinculado.id))
      );
      expect(inativar.status).toBe(200);
    });
  });

  describe('proteção do último Gerente (ADM) ativo', () => {
    let idUnico: number;

    it('prepara um cenário em que "gerente" é o único ADM ativo', async () => {
      const { Database } = await import('./db/Database');
      await Database.getInstancia().query("UPDATE usuario SET ativo = FALSE WHERE perfil = 'GERENTE' AND login <> 'gerente'");
      const lista = await (await listar('?nome=gerente&perfil=GERENTE&status=ATIVO')).json();
      idUnico = lista.find((u: { login: string }) => u.login === 'gerente').id;
      const ativos = await (await listar('?perfil=GERENTE&status=ATIVO')).json();
      expect(ativos).toHaveLength(1);
    });

    const base = { nome: 'Gerente Principal', login: 'gerente', cpf: CPF_ADM };

    it('não permite inativar o único ADM', async () => {
      const r = await rotas.item.PUT(json({ ...base, perfil: 'GERENTE', ativo: false }, 'PUT'), ctx(String(idUnico)));
      expect(r.status).toBe(400);
    });

    it('não permite rebaixar o cargo do único ADM', async () => {
      const r = await rotas.item.PUT(json({ ...base, perfil: 'FUNCIONARIO', ativo: true }, 'PUT'), ctx(String(idUnico)));
      expect(r.status).toBe(400);
    });

    it('não permite excluir o único ADM', async () => {
      const r = await rotas.item.DELETE(crua('', 'DELETE'), ctx(String(idUnico)));
      expect(r.status).toBe(400);
    });

    it('com outro ADM ativo, passa a permitir inativar o primeiro', async () => {
      await cadastrar({ nome: 'Segundo ADM', login: 'adm2', senha: 'demo', perfil: 'GERENTE', cpf: CPF_C.replace('123.456.789-09', '168.995.350-09') });
      const r = await rotas.item.PUT(json({ ...base, perfil: 'GERENTE', ativo: false }, 'PUT'), ctx(String(idUnico)));
      expect(r.status).toBe(200);
      expect((await logar('gerente', 'demo')).status).toBe(401);
    });
  });
});
