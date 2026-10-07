-- Replace the closed PostgreSQL enum with managed supply categories.
-- Category keys remain stable in supplies while labels and availability can be edited.

ALTER TABLE public.supplies
  ALTER COLUMN category TYPE TEXT USING category::TEXT;

CREATE TABLE IF NOT EXISTS public.supply_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key VARCHAR(50) NOT NULL UNIQUE
    CHECK (category_key ~ '^[a-z0-9_]+$'),
  name VARCHAR(80) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.supply_categories (category_key, name)
VALUES
  ('limpeza', 'Limpeza'),
  ('escritorio', 'Escritório'),
  ('evento', 'Evento'),
  ('manutencao', 'Manutenção'),
  ('tecnologia', 'Tecnologia'),
  ('consumo', 'Consumo'),
  ('administrativo', 'Administrativo'),
  ('seguranca', 'Segurança'),
  ('higiene', 'Higiene'),
  ('outro', 'Outro')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO public.supply_categories (category_key, name)
SELECT DISTINCT
  lower(regexp_replace(category, '[^a-zA-Z0-9]+', '_', 'g')),
  initcap(replace(category, '_', ' '))
FROM public.supplies
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT (category_key) DO NOTHING;

ALTER TABLE public.supply_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view supply categories" ON public.supply_categories;
CREATE POLICY "Authenticated users can view supply categories"
ON public.supply_categories FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Managers can create supply categories" ON public.supply_categories;
CREATE POLICY "Managers can create supply categories"
ON public.supply_categories FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

DROP POLICY IF EXISTS "Managers can update supply categories" ON public.supply_categories;
CREATE POLICY "Managers can update supply categories"
ON public.supply_categories FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));

CREATE INDEX IF NOT EXISTS idx_supply_categories_status_name
ON public.supply_categories(status, name);
