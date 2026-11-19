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

  // nenhum Controller do sistema é Singleton: a rota cria com `new` (só o Database é Singleton)
  const singleton = false as boolean;

  describe(singleton ? 'Controller: Singleton' : 'Controller: não se auto-instancia', () => {
    it.runIf(singleton)('instância estática privada + construtor privado + getInstancia()', () => {
      expect(controller).toMatch(/private\s+static\s+instancia/);
      expect(controller).toMatch(/private\s+constructor\s*\(/);
      expect(controller).toMatch(new RegExp(`static\\s+getInstancia\\s*\\(\\s*\\)\\s*:\\s*${m.classe}`));
    });
    it.runIf(!singleton)('construtor público, sem instância estática nem getInstancia() de si mesmo', () => {
      expect(controller).not.toMatch(/static\s+(private\s+)?instancia/);
      expect(controller).not.toMatch(new RegExp(`static\\s+getInstancia\\s*\\(\\s*\\)\\s*:\\s*${m.classe}`));
      expect(controller).not.toMatch(/private\s+constructor/);
      expect(controller).not.toMatch(new RegExp(`${m.classe}\\.getInstancia`));
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

  describe('Rotas (View/API) só conhecem o Controller ou Service', () => {
    it.each(m.rotas)('%s não importa Model, DAO nem Database', (rota) => {
      const codigo = ler(rota);
      expect(importa(codigo, /\/dao\//)).toBe(false);
      expect(importa(codigo, /db\/Database/)).toBe(false);
      expect(importa(codigo, new RegExp(`model/${m.modelClasse}`))).toBe(false);
      if (singleton) {
        expect(codigo).toMatch(new RegExp(`${m.classe}\\.getInstancia\\(\\)`));
        expect(codigo).not.toMatch(new RegExp(`new\\s+${m.classe}`));
      } else {
        expect(codigo).toMatch(new RegExp(`new\\s+${m.classe}\\s*\\(\\s*\\)`));
        expect(codigo).not.toMatch(new RegExp(`${m.classe}\\.getInstancia`));
      }
    });
  });
});

describe.each([
  { nome: 'RF_F3 - Receber doação de produto', classe: 'ReceberDoacaoProdutoController', rotas: ['app/api/doacoes/produto/route.ts'] },
  { nome: 'RF_F11 - Receber doação em dinheiro', classe: 'ReceberDoacaoDinheiroController', rotas: ['app/api/doacoes/dinheiro/route.ts'] },
])('Arquitetura (sem auto-instanciar) - $nome', (m) => {
  const controller = ler(`server/${m.classe}.ts`);

  it('Controller não se auto-instancia: construtor público, sem static instancia/getInstancia', () => {
    expect(controller).not.toMatch(/static\s+(private\s+)?instancia/);
    expect(controller).not.toMatch(/static\s+getInstancia/);
    expect(controller).not.toMatch(/private\s+constructor/);
  });
  it('mantém a conexão do Database Singleton e controla a transação', () => {
    expect(controller).toMatch(/this\.conexao\s*=\s*Database\.getInstancia\(\)/);
    expect(controller).toMatch(/this\.conexao\.comTransacao/);
  });
  it('não chama nenhum outro Controller e não toca em DAO', () => {
    expect(importa(controller, /Controller/)).toBe(false);
    expect(importa(controller, /\/dao\//)).toBe(false);
    expect(controller).not.toMatch(/new\s+\w*DAO\s*\(/);
  });
  it.each(m.rotas)('%s cria o Controller com new e não importa Model, DAO nem Database', (rota) => {
    const codigo = ler(rota);
    expect(codigo).toMatch(new RegExp(`new\\s+${m.classe}\\s*\\(\\s*\\)`));
    expect(codigo).not.toMatch(new RegExp(`${m.classe}\\.getInstancia`));
    expect(importa(codigo, /\/dao\//)).toBe(false);
    expect(importa(codigo, /db\/Database/)).toBe(false);
    expect(importa(codigo, /\/model\//)).toBe(false);
  });
});

describe('Hierarquia MVC nas doações (RF_F3 e RF_F11): Model não instancia Model', () => {
  it.each(['DoacaoProduto', 'DoacaoDinheiro', 'SelecaoDoador', 'FiltroDoacao', 'ItemDoacao'])(
    'model/%s.ts não importa Controller nem Database',
    (nome) => {
      const codigo = ler(`server/model/${nome}.ts`);
      expect(importa(codigo, /Controller/)).toBe(false);
      expect(importa(codigo, /db\/Database/)).toBe(false);
    }
  );

  // o Controller cria até os ItemDoacao (como o AbrirCotacaoController faz com os ItemCotacao)
  it.each(['DoacaoProduto', 'DoacaoDinheiro', 'SelecaoDoador', 'FiltroDoacao', 'ItemDoacao'])('model/%s.ts não importa nenhum outro Model em tempo de execução', (nome) => {
    // import de valor de outro Model da mesma pasta (./Algo), exceto o utilitário de datas
    expect(ler(`server/model/${nome}.ts`)).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+['"]\.\/(?!datasBR)\w+['"]/m);
  });

  it.each(['ReceberDoacaoProdutoController', 'ReceberDoacaoDinheiroController'])('%s cria o Doador e a escolha do doador', (nome) => {
    const codigo = ler(`server/${nome}.ts`);
    expect(codigo).toMatch(/new\s+SelecaoDoador\s*\(/);
    expect(codigo).toMatch(/new\s+Doador\s*\(/);
  });

  it('ReceberDoacaoProdutoController cria os ItemDoacao e entrega à doação', () => {
    expect(ler('server/ReceberDoacaoProdutoController.ts')).toMatch(/new\s+ItemDoacao\s*\(/);
  });

  it('DoacaoDinheiro não depende dos Models do caixa nem do doador, nem como tipo (recebe só a data de abertura)', () => {
    const codigo = ler('server/model/DoacaoDinheiro.ts');
    for (const outro of ['Caixa', 'MovimentacaoCaixa', 'Doador', 'SelecaoDoador']) {
      expect(codigo).not.toMatch(new RegExp(`from\\s+['"]\\./${outro}['"]`));
    }
  });

  it('ReceberDoacaoDinheiroController cria os Models do caixa (RF_F6) em vez de chamar o CaixaController', () => {
    const codigo = ler('server/ReceberDoacaoDinheiroController.ts');
    expect(codigo).toMatch(/Caixa\.buscarAberto\(/);
    expect(codigo).toMatch(/new\s+MovimentacaoCaixa\s*\(/);
    expect(importa(codigo, /CaixaController/)).toBe(false);
  });

  it('ReceberDoacaoProdutoController cria os Models do estoque (RF_F1) em vez de chamar o AtualizarEstoqueController', () => {
    const codigo = ler('server/ReceberDoacaoProdutoController.ts');
    expect(codigo).toMatch(/new\s+Produto\s*\(/);
    expect(codigo).toMatch(/new\s+MovimentacaoEstoque\s*\(/);
    expect(importa(codigo, /AtualizarEstoqueController/)).toBe(false);
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

describe('Instanciação em tempo de execução (Cotações)', () => {
  it('Controllers de cotação não são Singleton: cada new cria um objeto distinto', async () => {
    const { AbrirCotacaoController } = await import('./AbrirCotacaoController');
    const { AprovarCotacaoController } = await import('./AprovarCotacaoController');
    expect(new AbrirCotacaoController()).not.toBe(new AbrirCotacaoController());
    expect(new AprovarCotacaoController()).not.toBe(new AprovarCotacaoController());
  });
});

describe.each([
  { nome: 'RF_B3 - Gerenciar produtos', classe: 'ProdutoController', rotas: ['app/api/produtos/route.ts', 'app/api/produtos/[id]/route.ts'] },
  { nome: 'RF_F1 - Atualizar estoque', classe: 'AtualizarEstoqueController', rotas: ['app/api/estoque/movimentacoes/route.ts'] },
  { nome: 'RF_F2 - Lançar entrada de compras', classe: 'LancarEntradaCompraController', rotas: ['app/api/compras/route.ts'] },
])('Arquitetura (sem auto-instanciar) - $nome', (m) => {
  const controller = ler(`server/${m.classe}.ts`);

  it('Controller não se auto-instancia: construtor público, sem static instancia/getInstancia', () => {
    expect(controller).not.toMatch(/static\s+(private\s+)?instancia/);
    expect(controller).not.toMatch(/static\s+getInstancia/);
    expect(controller).not.toMatch(/private\s+constructor/);
  });
  it('mantém a conexão do Database Singleton', () => {
    expect(controller).toMatch(/this\.conexao\s*=\s*Database\.getInstancia\(\)/);
  });
  it('não importa nem instancia DAO', () => {
    expect(importa(controller, /\/dao\/(?!tipos)/)).toBe(false);
    expect(controller).not.toMatch(/new\s+\w*DAO\s*\(/);
  });
  it.each(m.rotas)('%s cria o Controller com new e não importa Model, DAO nem Database', (rota) => {
    const codigo = ler(rota);
    expect(codigo).toMatch(new RegExp(`new\\s+${m.classe}\\s*\\(\\s*\\)`));
    expect(codigo).not.toMatch(new RegExp(`${m.classe}\\.getInstancia`));
    expect(importa(codigo, /\/dao\//)).toBe(false);
    expect(importa(codigo, /db\/Database/)).toBe(false);
    expect(importa(codigo, /\/model\//)).toBe(false);
  });
});

// RF_F1 - Atualizar estoque: só o Controller de estoque é acionado, e só pelos Controllers dos casos de uso
// solicitantes (cada um cria o AtualizarEstoqueController com new, no ponto de uso). Model e DAO nunca chamam o AtualizarEstoqueController (fluxo C -> M -> DAO).
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

// Regra de dependência do projeto inteiro: o fluxo é sempre Controller -> Model -> DAO.
// Quem fica embaixo nunca chama quem fica em cima, e ninguém pula camada.
describe('Direção das dependências (todos os módulos)', () => {
  const listar = (pasta: string, filtro: (nome: string) => boolean) =>
    fs
      .readdirSync(path.join(SRC, pasta))
      .filter((nome) => nome.endsWith('.ts') && !nome.endsWith('.test.ts') && filtro(nome))
      .map((nome) => `${pasta}/${nome}`);
  // import "de valor" (os `import type` não criam dependência em tempo de execução)
  const importaValor = (codigo: string, modulo: RegExp) =>
    new RegExp(`import\\s+(?!type\\s)[^;]*from\\s+['"][^'"]*${modulo.source}['"]`).test(codigo);

  const models = listar('server/model', () => true);
  const daos = listar('server/dao', (n) => n.endsWith('DAO.ts'));
  const controllers = listar('server', (n) => n.endsWith('Controller.ts'));
  const rotas = (dir: string): string[] =>
    fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? rotas(`${dir}/${e.name}`) : e.name === 'route.ts' ? [`${dir}/${e.name}`] : []
    );

  it.each(models)('%s (Model) não importa Controller', (arquivo) => {
    expect(importaValor(ler(arquivo), /Controller/)).toBe(false);
  });

  it.each(daos)('%s (DAO) não importa Controller nem chama outro DAO', (arquivo) => {
    const codigo = ler(arquivo);
    expect(importa(codigo, /Controller/)).toBe(false);
    expect(codigo).not.toMatch(/new\s+\w*DAO\s*\(/);
  });

  it.each(daos)('%s (DAO) não chama métodos do Model de estoque', (arquivo) => {
    expect(importaValor(ler(arquivo), /model\/MovimentacaoEstoque/)).toBe(false);
  });

  it.each(controllers)('%s (Controller) não importa nem instancia DAO', (arquivo) => {
    const codigo = ler(arquivo);
    expect(importaValor(codigo, /\/dao\/(?!tipos)[^'"]*/)).toBe(false);
    expect(codigo).not.toMatch(/new\s+\w*DAO\s*\(/);
  });

  it.each([...rotas('app/api'), 'server/auth.ts'])('%s (View/API) não importa DAO', (arquivo) => {
    const codigo = ler(arquivo);
    expect(importa(codigo, /\/dao\/(?!tipos)[^'"]*/)).toBe(false);
    expect(codigo).not.toMatch(/new\s+\w*DAO\s*\(/);
  });
});

describe.each(['ProdutoDAO', 'MovimentacaoEstoqueDAO'])('%s (RF_B3 / RF_F1): conexão e dados só por parâmetro', (nome) => {
  const dao = ler(`server/dao/${nome}.ts`);
  it('não importa Database nem usa getInstancia (a conexão vem no construtor)', () => {
    expect(importa(dao, /db\/Database/)).toBe(false);
    expect(dao).not.toMatch(/getInstancia/);
  });
  it('não importa Model em tempo de execução nem dá new em Model', () => {
    expect(dao).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+['"][^'"]*\/model\//m);
  });
});

// Regras gerais: valem para todos os arquivos das pastas server e server/dao.
const arquivos = (pasta: string, sufixo: RegExp) =>
  fs.readdirSync(path.join(SRC, pasta)).filter((f) => sufixo.test(f) && !f.endsWith('.test.ts'));
const CONTROLLERS = arquivos('server', /Controller\.ts$/);
const DAOS = arquivos('server/dao', /DAO\.ts$/);

describe.each(CONTROLLERS)('Regra geral - %s', (arquivo) => {
  const controller = ler(`server/${arquivo}`);
  it('não se auto-instancia (sem instância estática, getInstancia, construtor privado ou globalThis)', () => {
    expect(controller).not.toMatch(/static\s+(private\s+)?instancia/);
    expect(controller).not.toMatch(/static\s+getInstanc/);
    expect(controller).not.toMatch(/private\s+constructor/);
    expect(controller).not.toMatch(/globalThis/);
  });
  it('não importa nem chama outro Controller', () => {
    expect(controller).not.toMatch(/from\s+['"][^'"]*Controller['"]/);
  });
});

describe.each(DAOS)('Regra geral - %s', (arquivo) => {
  const dao = ler(`server/dao/${arquivo}`);
  it('não importa Database nem usa getInstancia (a conexão vem no construtor)', () => {
    expect(importa(dao, /db\/Database/)).toBe(false);
    expect(dao).not.toMatch(/getInstancia/);
    expect(dao).toMatch(/constructor\(private readonly executor: ExecutorSQL\)/);
  });
  it('não importa Model em tempo de execução (só tipos) e não chama outro DAO', () => {
    expect(dao).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+['"][^'"]*\/model\/(?!datasBR)/m);
    expect(dao).not.toMatch(/from\s+['"]\.\/\w*DAO['"]/);
  });
});

// View (rotas da API e telas): só conhece o Controller; não importa Model, DAO nem Database,
// nem mesmo como tipo (slide 10 da Aula 71: a View não instancia nem conhece as Models).
function arquivosDe(pasta: string, ehAlvo: (nome: string) => boolean): string[] {
  const saida: string[] = [];
  for (const entrada of fs.readdirSync(path.join(SRC, pasta), { withFileTypes: true })) {
    const relativo = `${pasta}/${entrada.name}`;
    if (entrada.isDirectory()) saida.push(...arquivosDe(relativo, ehAlvo));
    else if (ehAlvo(entrada.name)) saida.push(relativo);
  }
  return saida;
}

describe.each(arquivosDe('app', (n) => /^(route\.ts|page\.tsx)$/.test(n)))('View - %s', (arquivo) => {
  it('não importa Model, DAO nem Database (só o Controller)', () => {
    const codigo = ler(arquivo);
    expect(codigo).not.toMatch(/from\s+['"][^'"]*\/server\/(model|dao|db)\//);
  });
});

describe('RF_F2 - ItemCompra persiste a si mesmo (slide 17: o SQL do item fica na entidade do item)', () => {
  const item = ler('server/model/ItemCompra.ts');
  const compra = ler('server/model/Compra.ts');
  it('o ItemCompra cria o CompraDAO(conexao) e grava o próprio item', () => {
    expect(importa(item, /dao\/CompraDAO/)).toBe(true);
    expect(item).toMatch(/new\s+CompraDAO\(conexao\)\.inserirItem\(compraId,\s*this\)/);
  });
  it('a Compra manda o item se gravar, sem chamar inserirItem do DAO', () => {
    expect(compra).toMatch(/item\.incluir\(conexao,/);
    expect(compra).not.toMatch(/\.inserirItem\(/);
  });
});
