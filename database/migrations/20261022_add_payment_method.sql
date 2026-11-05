BEGIN;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(20);
UPDATE transacoes
SET forma_pagamento = CASE WHEN cartao_id IS NOT NULL THEN 'cartao' ELSE 'a_vista' END
WHERE tipo = 'despesa' AND forma_pagamento IS NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transacoes_forma_pagamento_check' AND conrelid = 'transacoes'::regclass) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_forma_pagamento_check
      CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('a_vista', 'cartao'));
  END IF;
END $$;
COMMIT;
