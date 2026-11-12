-- ============================================================================
-- ATLAS - Schema do banco de dados (PostgreSQL)
-- Baseado no diagrama de classes da ERS (ver PROJETO-ATLAS.md, seção 4).
--
-- Este schema cobre TODAS as entidades do sistema, para servir de base para
-- todo o time. Cada desenvolvedor(a) liga suas próprias telas às tabelas que
-- são da sua função; nem todas as tabelas têm DAO/Controller implementados
-- ainda (ver README da seção "Banco de dados").
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RF_B2 / Usuário (Gerente, Secretário, Funcionário)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    login VARCHAR(60) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('GERENTE', 'SECRETARIO', 'FUNCIONARIO')),
    cpf VARCHAR(14) UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;

-- ---------------------------------------------------------------------------
-- RF_B1 / Atendido
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atendido (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    data_nascimento DATE NOT NULL,
    sexo VARCHAR(20),
    responsavel_legal VARCHAR(120),
    data_cadastro TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RF_B4 / Doador
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doador (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    contato VARCHAR(120),
    tipo_pessoa VARCHAR(20) NOT NULL DEFAULT 'FISICA' CHECK (tipo_pessoa IN ('FISICA', 'JURIDICA')),
    anonimo BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- RF_B3 / Produto (controle de estoque)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produto (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL UNIQUE,
    categoria VARCHAR(60) NOT NULL,
    unidade_medida VARCHAR(30) NOT NULL,
    quantidade_estoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    data_validade DATE,
    numero_lote VARCHAR(30)
);

-- bancos criados antes do nº do lote: acrescenta a coluna sem perder dados
ALTER TABLE produto ADD COLUMN IF NOT EXISTS numero_lote VARCHAR(30);

-- RF_F1 - Atualizar estoque (histórico de movimentações)
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produto(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data TIMESTAMP NOT NULL DEFAULT now(),
    origem VARCHAR(255) NOT NULL,
    -- validade do que entrou (quando informada); na saída fica vazia
    data_validade DATE
);

-- bancos criados antes da validade na movimentação: acrescenta a coluna sem perder dados
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS data_validade DATE;

-- ---------------------------------------------------------------------------
-- RF_F2 / Compra (lançar entrada de compras)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compra (
    id SERIAL PRIMARY KEY,
    numero_nf VARCHAR(60) NOT NULL UNIQUE,
    data DATE NOT NULL,
    fornecedor VARCHAR(120) NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gerente_id INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS item_compra (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL REFERENCES compra(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produto(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(12, 2) NOT NULL,
    data_validade DATE
);

-- ---------------------------------------------------------------------------
-- RF_F3 / Doação de produto
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doacao_produto (
    id SERIAL PRIMARY KEY,
    doador_id INTEGER NOT NULL REFERENCES doador(id),
    data_recebimento TIMESTAMP NOT NULL DEFAULT now(),
    registrado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS item_doacao (
    id SERIAL PRIMARY KEY,
    doacao_produto_id INTEGER NOT NULL REFERENCES doacao_produto(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produto(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_validade DATE
);

-- ---------------------------------------------------------------------------
-- RF_F11 / Doação em dinheiro
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doacao_dinheiro (
    id SERIAL PRIMARY KEY,
    doador_id INTEGER NOT NULL REFERENCES doador(id),
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    forma_recebimento VARCHAR(40) NOT NULL,
    data TIMESTAMP NOT NULL DEFAULT now(),
    registrado_por INTEGER REFERENCES usuario(id)
);

-- ---------------------------------------------------------------------------
-- RF_F4 / RF_F5 / RF_F6 / Caixa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caixa (
    id SERIAL PRIMARY KEY,
    data_abertura TIMESTAMP NOT NULL DEFAULT now(),
    data_fechamento TIMESTAMP,
    saldo_fisico_abertura NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_digital_abertura NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saldo_fisico_fechamento NUMERIC(12, 2),
    saldo_digital_fechamento NUMERIC(12, 2),
    status VARCHAR(10) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
    aberto_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS movimentacao_caixa (
    id SERIAL PRIMARY KEY,
    caixa_id INTEGER NOT NULL REFERENCES caixa(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    origem VARCHAR(255) NOT NULL,
    data TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RF_F7 / RF_F8 / Cotação
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotacao (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    data_abertura TIMESTAMP NOT NULL DEFAULT now(),
    status VARCHAR(12) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'REPROVADA')),
    aberta_por INTEGER REFERENCES usuario(id),
    justificativa VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS item_cotacao (
    id SERIAL PRIMARY KEY,
    cotacao_id INTEGER NOT NULL REFERENCES cotacao(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produto(id),
    quantidade_desejada INTEGER NOT NULL CHECK (quantidade_desejada > 0)
);

-- ---------------------------------------------------------------------------
-- RF_F9 / Evento e Alocação de Recursos (Andressa)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    data DATE NOT NULL,
    descricao VARCHAR(500),
    criado_por INTEGER REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS alocacao_recurso (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('PRODUTO', 'FINANCEIRO')),
    produto_id INTEGER REFERENCES produto(id),
    quantidade INTEGER CHECK (quantidade > 0),
    valor NUMERIC(12, 2) CHECK (valor > 0),
    -- um recurso de produto tem produto_id + quantidade; um financeiro tem valor
    CONSTRAINT chk_alocacao_recurso_consistente CHECK (
        (tipo = 'PRODUTO' AND produto_id IS NOT NULL AND quantidade IS NOT NULL AND valor IS NULL)
        OR
        (tipo = 'FINANCEIRO' AND produto_id IS NULL AND quantidade IS NULL AND valor IS NOT NULL)
    )
);

-- ---------------------------------------------------------------------------
-- RF_F10 / Cardápio Diário (Andressa)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cardapio_diario (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    tipo_refeicao VARCHAR(20) NOT NULL CHECK (tipo_refeicao IN ('CAFE_DA_MANHA', 'ALMOCO', 'LANCHE', 'JANTAR')),
    criado_por INTEGER REFERENCES usuario(id),
    UNIQUE (data, tipo_refeicao)
);

CREATE TABLE IF NOT EXISTS item_cardapio (
    id SERIAL PRIMARY KEY,
    cardapio_id INTEGER NOT NULL REFERENCES cardapio_diario(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produto(id),
    quantidade_utilizada INTEGER NOT NULL CHECK (quantidade_utilizada > 0)
);

CREATE TABLE IF NOT EXISTS organizacao(
    id INT PRIMARY KEY DEFAULT 1,
    nome_fantasia VARCHAR(120) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    endereco VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(120),
    caminho_logo VARCHAR(255),
    CONSTRAINT chk_somente_um_registro CHECK (id = 1)
);