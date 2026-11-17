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

- O **Controller** não se auto-instancia (quem usa dá o `new`), guarda a conexão (`Database`), faz `new` dos Models e decide a
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

### Controller sem auto-instanciar (segunda parte da folha)

A folha pede "tirar o `new` da AtualizarEstoqueController dentro da própria classe (nas demais classes também)".
Ou seja, o Controller não se instancia: sem `private static instancia` e sem `getInstancia()`. Quem usa
dá o `new`. Foi aplicado em `AtualizarEstoqueController`, `ProdutoController` e `LancarEntradaCompraController`
(o mesmo critério que o PR #24 aplicou a Atendidos, Doação de Produto e Doação em Dinheiro):

- O construtor passou a ser público e continua obtendo a conexão por `Database.getInstancia()`
  (o `Database` segue Singleton).
- As rotas (`/api/produtos`, `/api/compras`, `/api/estoque/movimentacoes`) fazem `new XController()`.
- Os Controllers que pedem estoque (Compra, Cardápio e Evento) fazem `new AtualizarEstoqueController()`.
- Os demais Controllers (Caixa, Cardápio, Evento, Doador, Usuário, Parametrização, Cotações) ainda têm
  `getInstancia()`; cada responsável deve aplicar o mesmo.

### Estoque (RF_F1)

- `MovimentacaoEstoque` (Model): saíram `registrarEntrada` e `registrarSaida`, que chamavam o
  Controller. Ficaram `validar`, `registrar` e `consultar`.
- `AtualizarEstoqueController`: cria `new MovimentacaoEstoque` e `new Produto`. O `Produto` é criado
  só com o id e se carrega do banco por `carregarParaAtualizarEstoque(conexao)`, com `FOR UPDATE`.
- `Produto` (Model): o método estático `buscarParaAtualizarEstoque` virou o método de instância
  `carregarParaAtualizarEstoque`.

### Quem pede o estoque

Os Controllers criam `new AtualizarEstoqueController()` no ponto de uso e chamam `atualizarEstoque(...)`
dentro da transação, sem guardar o Controller em campo.

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

- **Controller chamando Controller.** Compra, Cardápio e Evento chamam o `AtualizarEstoqueController` (o RF_F1
  é um caso de uso oculto, solicitado pelos outros, como na ERS). A folha não proíbe isso, só pede C → M → DAO
  e instanciar os Models no Controller. A solução do PR #24 evitou esse caso copiando a lógica de estoque
  para dentro do Model `DoacaoProduto`, o que duplica o RF_F1. Mantivemos o Controller de estoque como ponto
  único das regras (saldo, produto inexistente, validade). Vale confirmar com a professora.
- **Singleton.** Ela deu "ok" em "Singleton e Façade" e, na mesma folha, pediu para tirar o `new` da classe.
  Lemos como: o Controller não se auto-instancia (o Singleton fica só no `Database`). Vale confirmar.
