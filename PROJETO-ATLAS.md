# ATLAS — Aplicação Tecnológica de Logística da Assistência Social

Documento de apoio ao desenvolvimento do sistema **ATLAS**, para a ONG **SOS Criança - Serviço de Obras Sociais de Presidente Prudente**, com base na ERS (Especificação de Requisitos de Software) entregue como Trabalho Bimestral Supervisionado de Engenharia de Software I.

Site oficial da ONG: https://soscriancaprudente.org/

---

## 1. Identidade visual da ONG (extraída do site/logo)

A logo "SOS Criança" usa duas cores principais, em formato arredondado/infantil:

| Cor | Hex | Uso |
|---|---|---|
| **Rosa (principal)** | `#D94062` | Marca, botões primários, navbar, destaques |
| **Amarelo/dourado (secundário)** | `#FFBA49` | Acentos, ícones, hover, chamadas de atenção |
| Rosa claro (apoio) | `#EA95A8` | Fundos suaves, badges, estados "info" |
| Pêssego claro (apoio) | `#FFE0AD` | Fundos suaves, cards, seções alternadas |
| Texto/fundo | `#2B2B2B` / `#FEFDFB` | Texto padrão / fundo base (quente, não branco puro) |

Essas cores substituem a paleta azul (`#2B7FFF`) do template original (LeadFlow AI), que era voltado a um SaaS B2B — aqui o tom precisa ser mais acolhedor, institucional e confiável, compatível com uma ONG de assistência social infantil.

---

## 2. Template-base utilizado (`LeadFlow-AI.zip`)

O `.zip` enviado é um **template de landing page (site institucional/marketing)** construído em:

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tema via `@theme inline` em `globals.css`, usando CSS variables)
- **lucide-react** (ícones) e **motion** (animações)
- Fontes: Geist (sans/mono) + Libre Baskerville

### Estrutura relevante

```
src/
├── app/
│   ├── (marketing)/        → página institucional pública (landing page)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (auth)/             → tela de login/cadastro (auth/page.tsx)
│   ├── layout.tsx          → layout raiz (fontes, metadata)
│   └── globals.css         → paleta de cores (variáveis --primary, --background...)
├── components/
│   ├── layout/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── sections/           → hero, features, pricing, process, reviews, faq, cta, stats
│   └── buyNowBtn.tsx
└── content/                → textos de cada seção, em arquivos .ts separados do componente
    ├── hero.ts, features.ts, cta.ts, faq.ts, pricing.ts, process.ts, reviews.ts, stats.ts
```

**Como o template foi pensado:** cada seção (`hero`, `features`, `pricing`, etc.) separa **conteúdo** (`src/content/*.ts`) de **apresentação** (`src/components/sections/*.tsx`). Isso é ótimo para o projeto da ONG: dá para reescrever só os arquivos de `content/` (textos sobre o ATLAS, a ONG, funcionalidades) sem mexer na estrutura visual.

O template originalmente vende um produto SaaS ("LeadFlow AI" — geração de leads com IA), com seções de **pricing** (planos pagos) e **reviews** de clientes que **não fazem sentido para uma ONG** e foram adaptadas/removidas.

### Como esse template será usado no projeto da ONG

Ele não é o sistema ATLAS em si (que é um CRUD de estoque, doações, caixa, cotações, cardápios), e sim a base para:

1. **Site institucional/apresentação do ATLAS** (página pública explicando o sistema e a ONG) — reaproveitando diretamente hero/features/process/cta/footer.
2. **Casca visual (design system) do sistema interno**: cores, tipografia, componentes de botão/card/navbar reaproveitados nas telas internas (dashboard, formulários de estoque, caixa, cotação etc.), que ainda precisam ser construídas como um módulo autenticado (`(app)/dashboard`, `(app)/estoque`, `(app)/doacoes`...), usando o padrão de login já existente em `(auth)/auth`.

Resumo do que foi feito/sugerido a partir do template:
- ✅ Paleta trocada para rosa/amarelo da ONG (`globals.css`)
- ✅ Textos de `content/*.ts` reescritos para o ATLAS/SOS Criança
- ✅ Seção de **pricing** removida (não se aplica a ONG) e substituída por seção de **impacto/transparência**
- ✅ Seção de **reviews** adaptada para depoimentos/parcerias
- 🔜 Próximo passo (fora do escopo deste MD): criar as telas internas do sistema (estoque, caixa, doações, cotação, cardápio) reaproveitando os componentes de UI (`src/components/ui`)

---

## 3. Resumo da ERS (Especificação de Requisitos de Software)

### 3.1 Objetivo
Apresentar os requisitos que o sistema **ATLAS** deve atender para apoiar o gerenciamento das atividades do SOS Criança.

### 3.2 Escopo
Sistema web responsivo para controle de:
- Atendidos, funcionários, doadores e produtos
- Estoque (entrada/saída automática)
- Doações (produto e dinheiro)
- Cardápios diários
- Caixa (abertura, fechamento, atualização)
- Cotações de compra (abrir/aprovar)
- Compras (entrada de produtos)
- Alocação de recursos para eventos
- Relatórios gerenciais diversos

**Fora do escopo:** integração bancária automática, emissão de notas fiscais eletrônicas, folha de pagamento/RH.

### 3.3 Perfis de usuário (atores)
| Ator | Principais responsabilidades |
|---|---|
| **Gerente** | Abrir/fechar caixa, lançar compras, aprovar cotações, alocar recursos para eventos |
| **Secretário** | Criar cardápio diário, abrir cotações |
| **Funcionário** | Registrar doações (produto/dinheiro) |
| **Sistema** (interno) | Atualizar estoque automaticamente a partir de outros casos de uso |

### 3.4 Requisitos funcionais (resumo por categoria)

**Básicos (RF_B)** — cadastros simples:
- RF_B1 Gerenciar atendidos
- RF_B2 Gerenciar funcionários
- RF_B3 Gerenciar produtos
- RF_B4 Gerenciar doadores

**Fundamentais (RF_F)** — regras de negócio centrais:
- RF_F1 Atualizar estoque · RF_F2 Lançar entrada de compras · RF_F3 Receber doação de produto
- RF_F4 Abrir caixa · RF_F5 Fechar caixa · RF_F6 Atualizar caixa
- RF_F7 Abrir cotação · RF_F8 Aprovar cotação
- RF_F9 Alocar recursos para eventos · RF_F10 Criar cardápio diário · RF_F11 Receber doação em dinheiro

**Saída (RF_S)** — relatórios e consultas (tempo de resposta ≤ 5s):
- Relatórios de produtos vencidos, estoque, doações recebidas, compras mensais, atendidos, doadores, contas a pagar, memória de cálculo anual, plano de aplicação anual, demonstrativos de despesas anuais
- Notificação de alimentos próximos ao vencimento
- Consulta de saldo de doações

### 3.5 Requisitos não funcionais principais
- **Segurança:** HTTPS, autenticação de usuários, conformidade com LGPD
- **Confiabilidade:** tolerância a falha via transação em banco (TBD/rollback)
- **Desempenho:** relatórios/notificações em até 5 segundos
- **Usabilidade:** interface responsiva, simples, para usuários com informática básica
- **Portabilidade:** acesso via navegador (Chrome/Firefox), Windows/Linux/Android/iOS

### 3.6 Arquitetura/infraestrutura definida na ERS
- Aplicação **web responsiva**, em **JavaScript** (Next.js/Node.js no back-end é compatível)
- Banco de dados **PostgreSQL**
- Hospedagem em **Oracle Cloud Infrastructure (OCI Free Tier)**
- Alternativas descartadas: sistema desktop (custo de servidor local) e app mobile nativo (custo de contas de desenvolvedor e manutenção multi-plataforma)

---

## 4. Modelo conceitual / Diagrama de classes

Baseado nos casos de uso descritos na ERS (Alocar recursos, Criar cardápio, Receber doação de produto/dinheiro, Atualizar estoque, Lançar entrada de compras, Abrir/Fechar/Atualizar caixa, Abrir/Aprovar cotação), o modelo conceitual abaixo consolida todas as entidades em um único diagrama coerente.

```mermaid
classDiagram
    class Usuario {
        +int id
        +string nome
        +string login
        +string senhaHash
        +PerfilUsuario perfil
        +boolean ativo
    }

    class PerfilUsuario {
        <<enumeration>>
        GERENTE
        SECRETARIO
        FUNCIONARIO
    }

    class Atendido {
        +int id
        +string nome
        +date dataNascimento
        +string sexo
        +string responsavelLegal
        +date dataCadastro
    }

    class Doador {
        +int id
        +string nome
        +string contato
        +string tipoPessoa
        +boolean anonimo
    }

    class Produto {
        +int id
        +string nome
        +string categoria
        +string unidadeMedida
        +int quantidadeEstoque
        +int estoqueMinimo
        +date dataValidade
    }

    class MovimentacaoEstoque {
        +int id
        +TipoMovimentacao tipo
        +int quantidade
        +datetime data
        +string origem
    }

    class TipoMovimentacao {
        <<enumeration>>
        ENTRADA
        SAIDA
    }

    class Compra {
        +int id
        +string numeroNF
        +date data
        +string fornecedor
        +decimal valorTotal
    }

    class ItemCompra {
        +int id
        +int quantidade
        +decimal valorUnitario
        +date dataValidade
    }

    class DoacaoProduto {
        +int id
        +date dataRecebimento
    }

    class ItemDoacao {
        +int id
        +int quantidade
        +date dataValidade
    }

    class DoacaoDinheiro {
        +int id
        +decimal valor
        +string formaRecebimento
        +date data
    }

    class Caixa {
        +int id
        +datetime dataAbertura
        +datetime dataFechamento
        +decimal saldoFisico
        +decimal saldoDigital
        +StatusCaixa status
    }

    class StatusCaixa {
        <<enumeration>>
        ABERTO
        FECHADO
    }

    class MovimentacaoCaixa {
        +int id
        +TipoMovimentacao tipo
        +decimal valor
        +string origem
        +datetime data
    }

    class Cotacao {
        +int id
        +string descricao
        +date dataAbertura
        +StatusCotacao status
        +string justificativa
    }

    class StatusCotacao {
        <<enumeration>>
        PENDENTE
        APROVADA
        REPROVADA
    }

    class ItemCotacao {
        +int id
        +int quantidadeDesejada
    }

    class Evento {
        +int id
        +string nome
        +date data
        +string descricao
    }

    class AlocacaoRecurso {
        +int id
        +TipoRecurso tipo
        +int quantidade
        +decimal valor
    }

    class TipoRecurso {
        <<enumeration>>
        PRODUTO
        FINANCEIRO
    }

    class CardapioDiario {
        +int id
        +date data
        +TipoRefeicao tipoRefeicao
    }

    class TipoRefeicao {
        <<enumeration>>
        CAFE_DA_MANHA
        ALMOCO
        LANCHE
        JANTAR
    }

    class ItemCardapio {
        +int id
        +int quantidadeUtilizada
    }

    %% Relacionamentos de autoria/responsabilidade (Usuario)
    Usuario "1" --> "*" Compra : registra (Gerente)
    Usuario "1" --> "*" DoacaoProduto : registra (Funcionário)
    Usuario "1" --> "*" DoacaoDinheiro : registra (Funcionário)
    Usuario "1" --> "*" Caixa : abre/fecha (Gerente)
    Usuario "1" --> "*" Cotacao : abre (Secretário)
    Usuario "1" --> "0..1" Cotacao : aprova (Gerente)
    Usuario "1" --> "*" Evento : cria (Gerente)
    Usuario "1" --> "*" CardapioDiario : cria (Secretário)
    Usuario "--" PerfilUsuario

    %% Estoque
    Produto "1" --> "*" MovimentacaoEstoque : possui
    MovimentacaoEstoque "--" TipoMovimentacao

    %% Compras
    Compra "1" --> "*" ItemCompra : contém
    ItemCompra "*" --> "1" Produto : refere-se a
    Compra ..> MovimentacaoEstoque : gera (RF_F1)

    %% Doação de produto
    Doador "1" --> "*" DoacaoProduto : realiza
    DoacaoProduto "1" --> "*" ItemDoacao : contém
    ItemDoacao "*" --> "1" Produto : refere-se a
    DoacaoProduto ..> MovimentacaoEstoque : gera (RF_F1)

    %% Doação em dinheiro
    Doador "1" --> "*" DoacaoDinheiro : realiza
    DoacaoDinheiro ..> MovimentacaoCaixa : gera (RF_F6)

    %% Caixa
    Caixa "1" --> "*" MovimentacaoCaixa : registra
    MovimentacaoCaixa "--" TipoMovimentacao
    Caixa "--" StatusCaixa

    %% Cotação
    Cotacao "1" --> "*" ItemCotacao : contém
    ItemCotacao "*" --> "1" Produto : refere-se a
    Cotacao "--" StatusCotacao

    %% Eventos e alocação de recursos
    Evento "1" --> "*" AlocacaoRecurso : recebe
    AlocacaoRecurso "0..1" --> "1" Produto : aloca (se tipo=PRODUTO)
    AlocacaoRecurso "--" TipoRecurso
    AlocacaoRecurso ..> MovimentacaoEstoque : gera (RF_F1, se produto)
    AlocacaoRecurso ..> MovimentacaoCaixa : gera (RF_F6, se financeiro)

    %% Cardápio
    CardapioDiario "1" --> "*" ItemCardapio : contém
    ItemCardapio "*" --> "1" Produto : utiliza (alimento)
    CardapioDiario ..> MovimentacaoEstoque : gera (RF_F1)
    CardapioDiario "--" TipoRefeicao
```

### 4.1 Leitura do modelo (relacionamentos-chave)

- **`Usuario`** é a classe central de autoria: todo caso de uso da ERS exige um ator autenticado (Gerente, Secretário ou Funcionário), e cada classe transacional (`Compra`, `DoacaoProduto`, `DoacaoDinheiro`, `Caixa`, `Cotacao`, `Evento`, `CardapioDiario`) guarda uma referência a quem a criou/aprovou.
- **`Produto` é o núcleo do estoque**: é referenciado por `ItemCompra`, `ItemDoacao`, `ItemCotacao`, `ItemCardapio` e `AlocacaoRecurso` — todos eles, direta ou indiretamente, geram uma `MovimentacaoEstoque` (implementando o caso de uso **RF_F1 - Atualizar estoque**, que a ERS descreve como "acionado internamente" por outros casos de uso).
- **`Caixa` e `MovimentacaoCaixa`** seguem o mesmo padrão do estoque: `DoacaoDinheiro` e `AlocacaoRecurso` (quando financeira) geram movimentações que atualizam o caixa (**RF_F6**).
- **Composições (1 → \*) com "contém"** (`Compra`→`ItemCompra`, `DoacaoProduto`→`ItemDoacao`, `Cotacao`→`ItemCotacao`, `CardapioDiario`→`ItemCardapio`) representam os laços de repetição descritos nos fluxos básicos da ERS ("sistema repete os passos X e Y até o usuário concluir a inclusão de itens").
- **`Cotacao`** tem dois relacionamentos com `Usuario`: quem abre (Secretário, RF_F7) e quem aprova/reprova (Gerente, RF_F8) — por isso aparece duas vezes no diagrama com cardinalidades diferentes.
- **Doador** pode ser anônimo (`anonimo: boolean`), conforme fluxo alternativo "1.1 Doador não cadastrado ou anônimo" presente nos dois casos de uso de doação.

---

## 5. Próximos passos sugeridos

1. Aplicar a paleta rosa/amarelo também nas telas internas do sistema (dashboards de estoque, caixa, cotação).
2. Modelar o banco de dados PostgreSQL a partir do diagrama de classes da seção 4 (gerar DDL).
3. Implementar as telas internas autenticadas reaproveitando os componentes do template (`navbar`, `footer`, `ui/*`), dentro de um grupo de rotas `(app)` protegido por login.
4. Validar com a coordenadora da ONG (Vanessa Vasconcelos Brigatti) os campos exatos dos relatórios (RF_S1 a RF_S13).
