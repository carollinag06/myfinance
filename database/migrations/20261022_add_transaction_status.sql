BEGIN;
-- Somente registros antigos sem situacao sao classificados pela data.
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS status VARCHAR(20);
UPDATE transacoes SET status = CASE WHEN data <= CURRENT_DATE THEN 'realizado' ELSE 'previsto' END
WHERE status IS NULL;
ALTER TABLE transacoes ALTER COLUMN status SET DEFAULT 'previsto';
ALTER TABLE transacoes ALTER COLUMN status SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transacoes_status_check' AND conrelid = 'transacoes'::regclass) THEN
    ALTER TABLE transacoes ADD CONSTRAINT transacoes_status_check CHECK (status IN ('previsto', 'realizado'));
  END IF;
END $$;
COMMIT;
