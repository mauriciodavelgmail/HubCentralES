-- Restrict inventory assignment to operationally authorized profiles.

CREATE OR REPLACE FUNCTION public.validate_inventory_responsible_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.responsible_profile_id
      AND is_active = true
      AND role IN ('administrador', 'administracao', 'manutencao')
  ) THEN
    RAISE EXCEPTION 'O responsável deve possuir perfil Administrador, Administração ou Manutenção.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_inventory_responsible_role_trigger
ON public.inventory_requests;

CREATE TRIGGER validate_inventory_responsible_role_trigger
BEFORE INSERT OR UPDATE OF responsible_profile_id
ON public.inventory_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_inventory_responsible_role();

NOTIFY pgrst, 'reload schema';
