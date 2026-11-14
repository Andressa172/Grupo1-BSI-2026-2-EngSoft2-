# Correção do MVC — RF_F1 Atualizar Estoque (Luís Gustavo)

Folha de correção de 13/11/2026 (tela avaliada: "F1 – Atualizar estoque").

Este documento explica o que a professora pediu, o que estava errado, o que foi mudado e como
conferir. Existe um commit só com a mudança de código (que passou por todos os módulos) e este
commit só com a explicação, para quem quiser ler e ajustar o próprio módulo depois.

## O que a professora escreveu

| Item da folha | Nota |
|---|---|
| Interface, máscaras, campos obrigatórios, FK, mensagens de erro | ok |
| Singleton e Façade | ok |
| **Classes 3 camadas** | **"arrumar Controle / Model"** |

Observações gerais:

> **C → M → DAO**
> * Tirar o `new` da AtualizarEstoqueController dentro da própria classe (nas demais classes também)
> * Instanciar os models aqui

## A regra

O fluxo é **sempre Controller → Model → DAO**. Quem fica embaixo nunca chama quem fica em cima,
e ninguém pula camada:

- O **Controller** é Singleton, guarda a conexão (`Database`), faz `new` dos Models e decide a
  transação. Não importa nem instancia DAO.
- O **Model** valida os próprios dados e persiste fazendo `new XDAO(conexao)` com a conexão que o
  Controller passou. Não importa Controller.
- O **DAO** só executa SQL. Não importa Controller, não chama outro DAO e não chama Model de outro
  caso de uso.

## O que estava errado

O `AtualizarEstoqueController` (RF_F1) é chamado por outros casos de uso (compra, doação,
cardápio, evento). Quem pedia o estoque era o Model ou o DAO, e a seta ficava ao contrário:

```
Antes:   CardapioDiarioDAO / EventoDAO  ──►  MovimentacaoEstoque (Model)  ──►  AtualizarEstoqueController
         Compra / DoacaoProduto (Model) ──►  MovimentacaoEstoque (Model)  ──►  AtualizarEstoqueController
```

Havia o mesmo padrão fora do estoque: `DoacaoDinheiro` (Model) chamava o `CaixaController`,
`CaixaController` e `ParametrizarOrganizacaoController` usavam o DAO direto, e as rotas
`/api/cardapios`, `/api/eventos` e o `auth.ts` chamavam DAO.

## O que foi mudado

### Estoque (RF_F1)

- `MovimentacaoEstoque` (Model): saíram `registrarEntrada` e `registrarSaida`, que chamavam o
  Controller. Ficaram `validar`, `registrar` e `consultar`.
- `AtualizarEstoqueController`: cria `new MovimentacaoEstoque` e `new Produto`. O `Produto` é criado
  só com o id e se carrega do banco por `carregarParaAtualizarEstoque(conexao)`, com `FOR UPDATE`.
- `Produto` (Model): o método estático `buscarParaAtualizarEstoque` virou o método de instância
  `carregarParaAtualizarEstoque`.

### Quem pede o estoque

Os Controllers chamam `AtualizarEstoqueController.getInstancia().atualizarEstoque(...)` direto, no
ponto de uso e dentro da transação, sem guardar o Controller em campo.

| Caso de uso | Antes | Depois |
|---|---|---|
| Compra (RF_F2) | `Compra.incluir` dava a entrada | `Compra.incluir` grava a compra, `Compra.incluirItem` grava cada item. O `LancarEntradaCompraController` faz o laço: estoque, depois item |
| Doação de produto (RF_F3) | `DoacaoProduto.incluir` dava a entrada | Igual, com `DoacaoProduto.incluirItem` |
| Cardápio (RF_F10) | `CardapioDiarioDAO.registrarItem` e `restaurarEstoqueItens` | O DAO só tem `inserirItem`, `listarItens` e `buscarCategoriaProduto`. O `CriarCardapioController` faz saída e estorno |
| Evento (RF_F9) | `EventoDAO.registrarRecurso` e `restaurarEstoqueRecursos` | O DAO só tem `inserirRecurso` e `listarProdutosAlocados`. O `AlocarRecursosController` faz saída e estorno |

A ordem das operações dentro da transação é a mesma de antes (por exemplo, o estoque é movimentado
antes de gravar o item, para um produto inexistente dar a mesma mensagem de erro).

### Fora do estoque

- `DoacaoDinheiro` (Model) não chama mais o `CaixaController`. O `ReceberDoacaoDinheiroController`
  lança a entrada no caixa e avisa o Model por `setCaixaAtualizado`.
- `CaixaController` e `ParametrizarOrganizacaoController` não usam mais DAO. Os Models `Caixa`,
  `MovimentacaoCaixa` e `Organizacao` criam o DAO.
- `/api/cardapios` e `/api/eventos` pegam os produtos pelo Controller (`listarProdutos`), e não
  mais por `ProdutoDAO.getInstancia()`.
- `auth.ts` (`exigirGerente`) passa pelo `UsuarioController`. Perdeu o parâmetro `usuarioDAO`.
- `ProdutoDAO`, `DoadorDAO`, `EventoDAO` e `CardapioDiarioDAO` perderam o `getInstancia()` (DAO não
  é Singleton e ninguém mais usava).
- `CaixaController` e `ParametrizarOrganizacaoController` trocaram `globalThis` por
  `private static instancia`.

## Como conferir

O teste `src/server/arquitetura.test.ts` agora cobre o projeto inteiro (bloco "Direção das
dependências"). Ele falha se um Model importar Controller, se um DAO importar Controller ou chamar
outro DAO, ou se um Controller, rota ou `auth.ts` importar ou instanciar DAO.

```bash
npm test                                       # testes de unidade
TEST_DATABASE_URL=postgresql://atlas:atlas@localhost:5432/atlas npm test   # com banco (597 testes)
```

## Se for ajustar o seu módulo

- Se o seu Model ou DAO chamava um Controller, mova essa chamada para o seu Controller (dentro da
  transação, se houver).
- Se o seu Controller usava DAO, passe a chamada por um método do Model, que faz `new XDAO(conexao)`.
- Os testes de Caixa e Parametrização mudaram: o Caixa usa `vi.mock('./dao/CaixaDAO')` e a
  Parametrização usa uma conexão falsa, porque o Controller não recebe mais o DAO.

## Pontos em aberto

- "Tirar o `new` da AtualizarEstoqueController dentro da própria classe": foi entendido como
  nenhuma outra classe criar ou pegar o Controller de estoque por dentro, só os Controllers
  solicitantes, no ponto de uso. O `new` dentro do `getInstancia()` do próprio Singleton fica,
  porque é o padrão que a folha aprovou. Vale confirmar com a professora.
- `ReceberDoacaoDinheiroController` ainda guarda o `CaixaController` em campo (`this.caixa`). Não
  foi mudado por ser do caixa, e não do estoque.
