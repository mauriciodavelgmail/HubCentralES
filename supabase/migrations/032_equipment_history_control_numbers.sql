-- Human-readable, immutable control numbers for every asset-ledger operation.

ALTER TABLE public.equipment_history
  ADD COLUMN IF NOT EXISTS operation_number TEXT;

CREATE SEQUENCE IF NOT EXISTS public.equipment_operation_number_seq;

WITH numbered AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS sequence_number,
    CASE
      WHEN action IN ('movimentacao', 'movimentacao_lote') THEN 'MV'
      WHEN action IN ('baixa', 'baixa_lote') THEN 'BX'
      WHEN action = 'cancelamento_baixa' THEN 'CB'
      WHEN action = 'cadastro' THEN 'CD'
      WHEN action = 'inventario' THEN 'IV'
      ELSE 'OP'
    END AS prefix,
    created_at
  FROM public.equipment_history
  WHERE operation_number IS NULL
)
UPDATE public.equipment_history history
SET operation_number = numbered.prefix || '-' ||
  to_char(numbered.created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD') || '-' ||
  lpad(numbered.sequence_number::TEXT, 8, '0')
FROM numbered
WHERE history.id = numbered.id;

DO $$
DECLARE v_count BIGINT;
BEGIN
  SELECT count(*) INTO v_count FROM public.equipment_history;
  IF v_count > 0 THEN
    PERFORM setval('public.equipment_operation_number_seq', v_count, true);
  ELSE
    PERFORM setval('public.equipment_operation_number_seq', 1, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_equipment_operation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
BEGIN
  IF NEW.operation_number IS NOT NULL THEN RETURN NEW; END IF;
  v_prefix := CASE
    WHEN NEW.action IN ('movimentacao', 'movimentacao_lote') THEN 'MV'
    WHEN NEW.action IN ('baixa', 'baixa_lote') THEN 'BX'
    WHEN NEW.action = 'cancelamento_baixa' THEN 'CB'
    WHEN NEW.action = 'cadastro' THEN 'CD'
    WHEN NEW.action = 'inventario' THEN 'IV'
    ELSE 'OP'
  END;
  NEW.operation_number := v_prefix || '-' ||
    to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD') || '-' ||
    lpad(nextval('public.equipment_operation_number_seq')::TEXT, 8, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_equipment_operation_number_trigger ON public.equipment_history;
CREATE TRIGGER assign_equipment_operation_number_trigger
BEFORE INSERT ON public.equipment_history
FOR EACH ROW EXECUTE FUNCTION public.assign_equipment_operation_number();

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_history_operation_number
ON public.equipment_history(operation_number);

ALTER TABLE public.equipment_history
  ALTER COLUMN operation_number SET NOT NULL;

NOTIFY pgrst, 'reload schema';
