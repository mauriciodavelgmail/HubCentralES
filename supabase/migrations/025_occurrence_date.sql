-- Date on which an occurrence was registered or happened.
-- The UI and the automatic event checklist workflow already use this field.

ALTER TABLE public.occurrences
  ADD COLUMN IF NOT EXISTS occurred_at DATE;

UPDATE public.occurrences
SET occurred_at = COALESCE(created_at::DATE, CURRENT_DATE)
WHERE occurred_at IS NULL;

ALTER TABLE public.occurrences
  ALTER COLUMN occurred_at SET DEFAULT CURRENT_DATE,
  ALTER COLUMN occurred_at SET NOT NULL;

COMMENT ON COLUMN public.occurrences.occurred_at IS
  'Data em que a ocorrência foi registrada ou aconteceu.';

-- Ask PostgREST/Supabase to refresh its schema cache immediately.
NOTIFY pgrst, 'reload schema';

