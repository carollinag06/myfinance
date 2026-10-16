ALTER TYPE enum_transacoes_tipo
  ADD VALUE IF NOT EXISTS 'receita';

ALTER TYPE enum_transacoes_tipo
  ADD VALUE IF NOT EXISTS 'despesa';
