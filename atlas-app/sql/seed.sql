-- ============================================================================
-- ATLAS - Dados de exemplo para desenvolvimento/demonstração local.
-- Rodar depois do schema.sql: npm run db:seed
-- ============================================================================

INSERT INTO usuario (nome, login, senha_hash, perfil, cpf) VALUES
    ('Gerente SOS Criança', 'gerente', 'demo', 'GERENTE', '52998224725'),
    ('Secretário SOS Criança', 'secretario', 'demo', 'SECRETARIO', '11144477735'),
    ('Funcionário SOS Criança', 'funcionario', 'demo', 'FUNCIONARIO', '12345678909')
ON CONFLICT (login) DO UPDATE SET cpf = EXCLUDED.cpf WHERE usuario.cpf IS NULL;

INSERT INTO produto (nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, data_validade, numero_lote) VALUES
    ('Arroz 5kg', 'Alimento', 'pacote', 42, 10, '2027-03-01', 'ARZ-2027-01'),
    ('Feijão 1kg', 'Alimento', 'pacote', 18, 15, '2026-12-15', 'FJN-2026-12'),
    ('Leite em pó', 'Alimento', 'lata', 6, 10, '2026-11-05', 'LTP-2026-11'),
    ('Óleo de soja', 'Alimento', 'litro', 24, 8, '2027-01-20', 'OLS-2027-01'),
    ('Material escolar (kit)', 'Material', 'kit', 30, 5, NULL, 'MAT-2026-01')
ON CONFLICT (nome) DO NOTHING;

-- produtos cadastrados antes do nº do lote recebem um lote provisório
UPDATE produto SET numero_lote = 'LOTE-' || lpad(id::text, 4, '0') WHERE numero_lote IS NULL;

INSERT INTO doador (nome, telefone, email, cpf_cnpj, tipo_pessoa, anonimo) VALUES
    ('Supermercado Boa Compra', '(18) 3222-1000', 'contato@boacompra.com.br', '12345678000195', 'JURIDICA', FALSE),
    ('Maria Aparecida', '(18) 99999-1234', 'maria.aparecida@gmail.com', '52998224725', 'FISICA', FALSE),
    ('Cassia Oliveira', '(18) 98888-5555', 'cassia.oliveira@gmail.com', '11144477735', 'FISICA', FALSE),
    ('Doador Anônimo', NULL, NULL, NULL, 'FISICA', TRUE)
ON CONFLICT DO NOTHING;

-- doação de arroz já registrada pra Cassia (pra dar pra testar a exclusão bloqueada por FK)
INSERT INTO doacao_produto (doador_id, data_recebimento)
SELECT d.id, now() FROM doador d
WHERE d.nome = 'Cassia Oliveira'
  AND NOT EXISTS (SELECT 1 FROM doacao_produto dp WHERE dp.doador_id = d.id);

INSERT INTO item_doacao (doacao_produto_id, produto_id, quantidade)
SELECT dp.id, p.id, 5
FROM doacao_produto dp
JOIN doador d ON d.id = dp.doador_id
JOIN produto p ON p.nome = 'Arroz 5kg'
WHERE d.nome = 'Cassia Oliveira'
  AND NOT EXISTS (SELECT 1 FROM item_doacao i WHERE i.doacao_produto_id = dp.id);

INSERT INTO organizacao (id, nome_fantasia, caminho_logo)
VALUES (1, 'Minha Organização', NULL)
ON CONFLICT (id) DO NOTHING;

-- Cotações de exemplo para demonstração de RF_F7 (Abrir cotação) e RF_F8 (Aprovar cotação)
DO $$
DECLARE
    v_secretario_id INTEGER;
    v_gerente_id INTEGER;
    v_arroz_id INTEGER;
    v_feijao_id INTEGER;
    v_leite_id INTEGER;
    v_oleo_id INTEGER;
    v_cotacao1_id INTEGER;
    v_cotacao2_id INTEGER;
BEGIN
    SELECT id INTO v_oleo_id FROM produto WHERE nome = 'Óleo de soja' LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM cotacao) THEN
        SELECT id INTO v_secretario_id FROM usuario WHERE login = 'secretario' LIMIT 1;
        SELECT id INTO v_gerente_id FROM usuario WHERE login = 'gerente' LIMIT 1;
        SELECT id INTO v_arroz_id FROM produto WHERE nome = 'Arroz 5kg' LIMIT 1;
        SELECT id INTO v_feijao_id FROM produto WHERE nome = 'Feijão 1kg' LIMIT 1;
        SELECT id INTO v_leite_id FROM produto WHERE nome = 'Leite em pó' LIMIT 1;

        IF v_secretario_id IS NOT NULL AND v_leite_id IS NOT NULL AND v_feijao_id IS NOT NULL THEN
            INSERT INTO cotacao (descricao, data_abertura, data_limite, status, aberta_por)
            VALUES ('Reposição mensal de alimentos básicos', '2026-04-10', '2026-04-25', 'PENDENTE', v_secretario_id)
            RETURNING id INTO v_cotacao1_id;

            INSERT INTO item_cotacao (cotacao_id, produto_id, quantidade_desejada) VALUES
                (v_cotacao1_id, v_leite_id, 20),
                (v_cotacao1_id, v_feijao_id, 15);
            IF v_oleo_id IS NOT NULL THEN
                INSERT INTO item_cotacao (cotacao_id, produto_id, quantidade_desejada) VALUES
                    (v_cotacao1_id, v_oleo_id, 12);
            END IF;
        END IF;

        IF v_secretario_id IS NOT NULL AND v_gerente_id IS NOT NULL AND v_arroz_id IS NOT NULL THEN
            INSERT INTO cotacao (descricao, data_abertura, data_limite, data_avaliacao, status, aberta_por, avaliada_por, justificativa)
            VALUES ('Compra emergencial de arroz para cestas básicas', '2026-04-02', '2026-04-15', '2026-04-03', 'APROVADA', v_secretario_id, v_gerente_id, 'Estoque crítico, compra autorizada com urgência.')
            RETURNING id INTO v_cotacao2_id;

            INSERT INTO item_cotacao (cotacao_id, produto_id, quantidade_desejada) VALUES
                (v_cotacao2_id, v_arroz_id, 30);
        END IF;
    END IF;

    UPDATE cotacao SET data_avaliacao = '2026-04-03' WHERE status = 'APROVADA' AND data_avaliacao IS NULL;

    -- garante que a cotação #1 de exemplo tenha 3 itens para demonstrar o limite de exibição
    SELECT id INTO v_cotacao1_id FROM cotacao WHERE descricao = 'Reposição mensal de alimentos básicos' LIMIT 1;
    IF v_cotacao1_id IS NOT NULL AND v_oleo_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM item_cotacao WHERE cotacao_id = v_cotacao1_id AND produto_id = v_oleo_id) THEN
            INSERT INTO item_cotacao (cotacao_id, produto_id, quantidade_desejada)
            VALUES (v_cotacao1_id, v_oleo_id, 12);
        END IF;
    END IF;
END $$;