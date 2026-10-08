-- The equipment UI historically referenced these fields, but they were absent
-- from the original database schema. Add them idempotently for existing projects.

ALTER TABLE public.equipments
  ADD COLUMN IF NOT EXISTS maintenance_status TEXT NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
  ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Preserve dates stored in the original columns when upgrading an existing base.
UPDATE public.equipments
SET
  purchase_date = COALESCE(purchase_date, acquisition_date),
  next_maintenance_date = COALESCE(next_maintenance_date, next_maintenance)
WHERE
  purchase_date IS NULL
  OR next_maintenance_date IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipments_maintenance_status_check'
  ) THEN
    ALTER TABLE public.equipments
      ADD CONSTRAINT equipments_maintenance_status_check
      CHECK (maintenance_status IN ('ok', 'atencao', 'alerta'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipments_maintenance_status
ON public.equipments(maintenance_status);

-- Ask PostgREST to refresh its schema immediately after this migration.
NOTIFY pgrst, 'reload schema';
