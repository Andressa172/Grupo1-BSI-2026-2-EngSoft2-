-- ============================================================================
-- ATLAS - Dados de exemplo para desenvolvimento/demonstração local.
-- Rodar depois do schema.sql: npm run db:seed
-- ============================================================================

INSERT INTO usuario (nome, login, senha_hash, perfil) VALUES
    ('Gerente SOS Criança', 'gerente', 'demo', 'GERENTE'),
    ('Secretário SOS Criança', 'secretario', 'demo', 'SECRETARIO'),
    ('Funcionário SOS Criança', 'funcionario', 'demo', 'FUNCIONARIO')
ON CONFLICT (login) DO NOTHING;

INSERT INTO produto (nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, data_validade) VALUES
    ('Arroz 5kg', 'Alimento', 'pacote', 42, 10, '2027-03-01'),
    ('Feijão 1kg', 'Alimento', 'pacote', 18, 15, '2026-12-15'),
    ('Leite em pó', 'Alimento', 'lata', 6, 10, '2026-11-05'),
    ('Óleo de soja', 'Alimento', 'litro', 24, 8, '2027-01-20'),
    ('Material escolar (kit)', 'Material', 'kit', 30, 5, NULL)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO doador (nome, contato, tipo_pessoa, anonimo) VALUES
    ('Supermercado Boa Compra', '(18) 3222-1000', 'JURIDICA', FALSE),
    ('Maria Aparecida', '(18) 99999-1234', 'FISICA', FALSE),
    ('Doador Anônimo', NULL, 'FISICA', TRUE)
ON CONFLICT DO NOTHING;
