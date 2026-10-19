ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'despesa';

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS is_padrao BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE categorias
SET tipo = 'receita', is_padrao = TRUE, descricao = COALESCE(descricao, 'Categoria padrao')
WHERE nome IN ('Salário', 'Freelance', 'Investimento', 'Presente');

UPDATE categorias
SET tipo = 'despesa', is_padrao = TRUE, descricao = COALESCE(descricao, 'Categoria padrao')
WHERE nome IN ('Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Outros');

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS grupo_parcelamento UUID;

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS numero_parcela INTEGER;

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS total_parcelas INTEGER;

CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_parcelamento
  ON transacoes (grupo_parcelamento)
  WHERE grupo_parcelamento IS NOT NULL;
