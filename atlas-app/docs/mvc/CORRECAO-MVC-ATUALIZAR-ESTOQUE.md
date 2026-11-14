# Correção do MVC — RF_F1 Atualizar Estoque (Luís Gustavo)

Folha de correção de 13/11/2026 (tela avaliada: "F1 – Atualizar estoque").

Este documento explica o que a professora pediu, o que estava errado, o que foi mudado e como
conferir. O código está em um commit e esta explicação em outro, para quem quiser ler e ajustar o próprio módulo depois.
A mesma correção nos demais módulos (Caixa, Parametrização, doação em dinheiro, rotas e `auth.ts`) vai em outro PR.

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

## Como conferir

O teste `src/server/arquitetura.test.ts` ganhou o bloco "RF_F1 - ninguém abaixo do Controller aciona o
estoque". Ele falha se um Model ou DAO importar o `AtualizarEstoqueController`, se um DAO chamar o Model de
estoque, se os atalhos `registrarEntrada`/`registrarSaida` voltarem ao Model, ou se o Controller de estoque
deixar de criar os Models.

```bash
npm test                                       # testes de unidade
TEST_DATABASE_URL=postgresql://atlas:atlas@localhost:5432/atlas npm test   # com banco
```

## Se for ajustar o seu módulo

- Se o seu Model ou DAO chamava um Controller, mova essa chamada para o seu Controller (dentro da
  transação, se houver).
- Se o seu Controller usava DAO, passe a chamada por um método do Model, que faz `new XDAO(conexao)`.

## Pontos em aberto

- "Tirar o `new` da AtualizarEstoqueController dentro da própria classe": foi entendido como
  nenhuma outra classe criar ou pegar o Controller de estoque por dentro, só os Controllers
  solicitantes, no ponto de uso. O `new` dentro do `getInstancia()` do próprio Singleton fica,
  porque é o padrão que a folha aprovou. Vale confirmar com a professora.
