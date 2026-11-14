# Correção do MVC nos demais módulos (Caixa, Parametrização, doação em dinheiro, rotas e auth)

Continuação do PR do RF_F1 Atualizar Estoque (`CORRECAO-MVC-ATUALIZAR-ESTOQUE.md`). A folha de correção
do estoque pediu **C → M → DAO**, e ao investigar o mesmo problema apareceu em outros módulos. Este PR
aplica a mesma regra neles, para cada responsável ler, conferir e ajustar o que quiser.

## A regra

O fluxo é sempre **Controller → Model → DAO**:

- O **Controller** é Singleton, guarda a conexão (`Database`), faz `new` dos Models e decide a
  transação. Não importa nem instancia DAO.
- O **Model** valida os próprios dados e persiste fazendo `new XDAO(conexao)` com a conexão que o
  Controller passou. Não importa Controller.
- O **DAO** só executa SQL. Não importa Controller e não chama outro DAO.

## O que foi mudado

| Módulo | Antes | Depois |
|---|---|---|
| Doação em dinheiro (RF_F11) | `DoacaoDinheiro` (Model) chamava o `CaixaController` | O `ReceberDoacaoDinheiroController` lança a entrada no caixa e avisa o Model por `setCaixaAtualizado`. `DoacaoDinheiro.incluir` só grava a doação |
| Caixa (RF_F4/F5/F6) | `CaixaController` criava o `CaixaDAO` por uma fábrica | Os Models `Caixa` e `MovimentacaoCaixa` criam o `CaixaDAO` (`Caixa.buscarAberto`, `caixa.incluir`, `caixa.fechar`, `caixa.listarMovimentacoes`, `movimentacao.incluir`) |
| Parametrização | `ParametrizarOrganizacaoController` usava o `OrganizacaoDAO` | `Organizacao.obter(conexao)` e `organizacao.salvar(conexao)` criam o DAO |
| Singleton do Caixa e da Parametrização | guardado em `globalThis` | `private static instancia` |
| `/api/cardapios` e `/api/eventos` | a rota chamava `ProdutoDAO.getInstancia()` | a rota chama `listarProdutos()` do Controller, que usa `Produto.listarTodos(conexao)` |
| `auth.ts` (`exigirGerente`) | usava `UsuarioDAO` direto | passa pelo `UsuarioController`; perdeu o parâmetro `usuarioDAO` |
| `ProdutoDAO`, `DoadorDAO`, `EventoDAO`, `CardapioDiarioDAO` | tinham `getInstancia()` | removido (DAO não é Singleton e ninguém mais usava) |

## Testes que mudaram

- `CaixaController.test.ts`: o Controller não recebe mais o DAO, então o DAO falso entra com
  `vi.mock('./dao/CaixaDAO')`. `criarParaTeste` agora só recebe a conexão.
- `ParametrizarOrganizacaoController.test.ts`: usa uma conexão falsa que responde às duas consultas do
  `OrganizacaoDAO`.
- `arquitetura.test.ts`: novo bloco "Direção das dependências (todos os módulos)", que falha se um Model
  importar Controller, se um DAO importar Controller ou chamar outro DAO, ou se um Controller, rota ou
  `auth.ts` importar ou instanciar DAO. Contra o código antigo ele acusava 13 violações.

O Caixa só tem teste de unidade, então o SQL dele não foi exercitado com banco nos testes.

## Se for ajustar o seu módulo

- Se o seu Model ou DAO chamava um Controller, mova essa chamada para o seu Controller (dentro da
  transação, se houver).
- Se o seu Controller usava DAO, passe a chamada por um método do Model, que faz `new XDAO(conexao)`.

## Pontos em aberto

- `ReceberDoacaoDinheiroController` ainda guarda o `CaixaController` em campo (`this.caixa`). Pode trocar
  por `CaixaController.getInstancia()` no ponto de uso, como foi feito com o estoque.
