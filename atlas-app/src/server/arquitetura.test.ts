// Testes de arquitetura (análise estática do código-fonte), sem banco de dados.
// Regra do projeto:
//   - Controller é Singleton, cria a conexão com o banco (Database, também Singleton);
//   - Controller cria o Model;
//   - Model cria o DAO.
// Usa o módulo de Atendidos (referência correta) como base e exige o mesmo do módulo de Usuários.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '..');
const ler = (relativo: string) => fs.readFileSync(path.join(SRC, relativo), 'utf8');
const importa = (codigo: string, modulo: RegExp) =>
  new RegExp(`import\\s[^;]*from\\s+['"][^'"]*${modulo.source}['"]`).test(codigo);

const MODULOS = [
  { nome: 'Atendidos (referência)', controller: 'server/GerenciarAtendidosController.ts', classe: 'GerenciarAtendidosController', model: 'server/model/Atendido.ts', dao: 'server/dao/AtendidoDAO.ts', modelClasse: 'Atendido', daoClasse: 'AtendidoDAO', rotas: ['app/api/atendidos/route.ts', 'app/api/atendidos/[id]/route.ts'] },
  { nome: 'Usuários / login', controller: 'server/UsuarioController.ts', classe: 'UsuarioController', model: 'server/model/Usuario.ts', dao: 'server/dao/UsuarioDAO.ts', modelClasse: 'Usuario', daoClasse: 'UsuarioDAO', rotas: ['app/api/usuarios/route.ts', 'app/api/usuarios/[id]/route.ts', 'app/api/auth/route.ts'] },
  { nome: 'RF_F7 - Abrir cotação', controller: 'server/AbrirCotacaoController.ts', classe: 'AbrirCotacaoController', model: 'server/model/Cotacao.ts', dao: 'server/dao/CotacaoDAO.ts', modelClasse: 'Cotacao', daoClasse: 'CotacaoDAO', rotas: ['app/api/cotacoes/route.ts'] },
  { nome: 'RF_F8 - Aprovar cotação', controller: 'server/AprovarCotacaoController.ts', classe: 'AprovarCotacaoController', model: 'server/model/Cotacao.ts', dao: 'server/dao/CotacaoDAO.ts', modelClasse: 'Cotacao', daoClasse: 'CotacaoDAO', rotas: ['app/api/cotacoes/[id]/route.ts'] },
];

describe('Singleton do Database', () => {
  const codigo = ler('server/db/Database.ts');
  it('tem construtor privado, instância estática e getInstancia()', () => {
    expect(codigo).toMatch(/private\s+static\s+instancia/);
    expect(codigo).toMatch(/private\s+constructor\s*\(/);
    expect(codigo).toMatch(/static\s+getInstancia\s*\(\s*\)\s*:\s*Database/);
  });
});

describe.each(MODULOS)('Arquitetura - $nome', (m) => {
  const controller = ler(m.controller);
  const model = ler(m.model);
  const dao = ler(m.dao);

  describe('Controller: Singleton', () => {
    it('instância estática privada + construtor privado + getInstancia()', () => {
      expect(controller).toMatch(/private\s+static\s+instancia/);
      expect(controller).toMatch(/private\s+constructor\s*\(/);
      expect(controller).toMatch(new RegExp(`static\\s+getInstancia\\s*\\(\\s*\\)\\s*:\\s*${m.classe}`));
    });
    it('não usa globalThis (a instância fica na própria classe)', () => {
      expect(controller).not.toMatch(/globalThis/);
    });
  });

  describe('Controller cria a conexão (Database Singleton)', () => {
    it('importa Database e obtém a conexão com Database.getInstancia()', () => {
      expect(importa(controller, /db\/Database/)).toBe(true);
      expect(controller).toMatch(/this\.conexao\s*=\s*Database\.getInstancia\(\)/);
    });
    it('nunca cria Pool/Client do pg diretamente', () => {
      expect(controller).not.toMatch(/new\s+(Pool|Client)\s*\(/);
      expect(importa(controller, /^pg$/)).toBe(false);
    });
  });

  describe('Controller cria o Model (e não o DAO)', () => {
    it('importa e instancia/usa o Model', () => {
      expect(importa(controller, new RegExp(`model/${m.modelClasse}`))).toBe(true);
      expect(controller).toMatch(new RegExp(`new\\s+${m.modelClasse}\\s*\\(`));
    });
    it('NÃO importa nem instancia nenhum DAO', () => {
      expect(importa(controller, /\/dao\//)).toBe(false);
      expect(controller).not.toMatch(/new\s+\w*DAO\s*\(/);
    });
    it('repassa a conexão ao Model (this.conexao)', () => {
      expect(controller).toMatch(/this\.conexao/);
    });
  });

  describe('Model cria o DAO com a conexão recebida', () => {
    it('importa o DAO e faz new DAO(conexao)', () => {
      expect(importa(model, new RegExp(`dao/${m.daoClasse}`))).toBe(true);
      expect(model).toMatch(new RegExp(`new\\s+${m.daoClasse}\\(conexao\\)`));
    });
    it('NÃO importa Database nem Controller (não abre conexão por conta própria)', () => {
      expect(importa(model, /db\/Database/)).toBe(false);
      expect(importa(model, /Controller/)).toBe(false);
      expect(model).not.toMatch(/Database\.getInstancia/);
      expect(model).not.toMatch(/new\s+(Pool|Client)\s*\(/);
    });
  });

  describe('DAO só executa SQL', () => {
    it('recebe o executor pelo construtor e não importa Controller', () => {
      expect(dao).toMatch(/constructor\s*\(\s*private\s+readonly\s+executor/);
      expect(importa(dao, /Controller/)).toBe(false);
    });
    it('usa apenas consultas parametrizadas (sem concatenar valores no SQL)', () => {
      expect(dao).not.toMatch(/query[^(]*\(\s*`[^`]*\$\{(?!COLUNAS|where)/);
    });
  });

  describe('Rotas (View/API) só conhecem o Controller', () => {
    it.each(m.rotas)('%s não importa Model, DAO nem Database', (rota) => {
      const codigo = ler(rota);
      expect(importa(codigo, /\/dao\//)).toBe(false);
      expect(importa(codigo, /db\/Database/)).toBe(false);
      expect(importa(codigo, new RegExp(`model/${m.modelClasse}`))).toBe(false);
      expect(codigo).toMatch(new RegExp(`${m.classe}\\.getInstancia\\(\\)`));
      expect(codigo).not.toMatch(new RegExp(`new\\s+${m.classe}`));
    });
  });
});

describe('Regras dos slides MVC/DAO para Cotações (RF_F7 e RF_F8)', () => {
  const abrirCtrl = ler('server/AbrirCotacaoController.ts');
  const aprovarCtrl = ler('server/AprovarCotacaoController.ts');
  const cotacaoModel = ler('server/model/Cotacao.ts');
  const itemCotacaoModel = ler('server/model/ItemCotacao.ts');

  it('AbrirCotacaoController instancia Cotacao, ItemCotacao e FiltroCotacao e faz o LOOP para gravar os itens em transação', () => {
    expect(abrirCtrl).toMatch(/new\s+ItemCotacao\s*\(/);
    expect(abrirCtrl).toMatch(/new\s+Cotacao\s*\(/);
    expect(abrirCtrl).toMatch(/new\s+FiltroCotacao\s*\(/);
    expect(abrirCtrl).toMatch(/this\.conexao\.comTransacao/);
    expect(abrirCtrl).toMatch(/for\s*\([^)]*cotacao\.getItens\(\)/);
    expect(abrirCtrl).toMatch(/item\.gravar\s*\(\s*idCotacao\s*,\s*tx\s*\)/);
  });

  it('ItemCotacao valida a si mesmo e cria o CotacaoDAO(conexao) para persistir o item', () => {
    expect(importa(itemCotacaoModel, /dao\/CotacaoDAO/)).toBe(true);
    expect(itemCotacaoModel).toMatch(/new\s+CotacaoDAO\(conexao\)/);
    expect(importa(itemCotacaoModel, /db\/Database/)).toBe(false);
    expect(importa(itemCotacaoModel, /Controller/)).toBe(false);
  });

  it('Cotacao mantém a lista de ItemCotacao e cria o CotacaoDAO(conexao) sem fazer o loop de persistência de itens', () => {
    expect(cotacaoModel).toMatch(/private\s+itens\s*:\s*ItemCotacao\[\]/);
    expect(cotacaoModel).toMatch(/new\s+CotacaoDAO\(conexao\)/);
    expect(cotacaoModel).not.toMatch(/registrarItem/);
  });

  it('AprovarCotacaoController controla a transação e as regras de negócio (IFs de cargo GERENTE e status PENDENTE)', () => {
    expect(aprovarCtrl).toMatch(/this\.conexao\.comTransacao/);
    expect(aprovarCtrl).toMatch(/gerente\.perfil\s*!==\s*'GERENTE'/);
    expect(aprovarCtrl).toMatch(/existente\.status\s*!==\s*'PENDENTE'/);
  });
});

describe('Singleton em tempo de execução (Controllers)', () => {
  it('getInstancia() sempre devolve o mesmo objeto em cada Controller', async () => {
    const { UsuarioController } = await import('./UsuarioController');
    const { AbrirCotacaoController } = await import('./AbrirCotacaoController');
    const { AprovarCotacaoController } = await import('./AprovarCotacaoController');
    expect(UsuarioController.getInstancia()).toBe(UsuarioController.getInstancia());
    expect(AbrirCotacaoController.getInstancia()).toBe(AbrirCotacaoController.getInstancia());
    expect(AprovarCotacaoController.getInstancia()).toBe(AprovarCotacaoController.getInstancia());
  });
});

// RF_F1 - Atualizar estoque: só o Controller de estoque é acionado, e só pelos Controllers dos casos de uso
// solicitantes. Model e DAO nunca chamam o AtualizarEstoqueController (fluxo C -> M -> DAO).
describe('RF_F1 - ninguém abaixo do Controller aciona o estoque', () => {
  const listar = (pasta: string, filtro: (nome: string) => boolean) =>
    fs
      .readdirSync(path.join(SRC, pasta))
      .filter((nome) => nome.endsWith('.ts') && !nome.endsWith('.test.ts') && filtro(nome))
      .map((nome) => `${pasta}/${nome}`);

  it.each(listar('server/model', () => true))('%s (Model) não importa o AtualizarEstoqueController', (arquivo) => {
    expect(importa(ler(arquivo), /AtualizarEstoqueController/)).toBe(false);
  });

  it.each(listar('server/dao', (n) => n.endsWith('DAO.ts')))('%s (DAO) não aciona o estoque', (arquivo) => {
    const codigo = ler(arquivo);
    expect(importa(codigo, /AtualizarEstoqueController/)).toBe(false);
    expect(importa(codigo, /model\/MovimentacaoEstoque/)).toBe(false);
  });

  it('o Model MovimentacaoEstoque não tem os atalhos que chamavam o Controller', () => {
    const codigo = ler('server/model/MovimentacaoEstoque.ts');
    expect(codigo).not.toMatch(/registrarEntrada|registrarSaida/);
  });

  it('o AtualizarEstoqueController cria os Models (MovimentacaoEstoque e Produto)', () => {
    const codigo = ler('server/AtualizarEstoqueController.ts');
    expect(codigo).toMatch(/new\s+MovimentacaoEstoque\s*\(/);
    expect(codigo).toMatch(/new\s+Produto\s*\(/);
  });
});
