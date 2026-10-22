-- Maintenance users need to update operational occurrences even when they
-- were reported by another profile or do not yet have a responsible person.
DROP POLICY IF EXISTS "Authorized users can update occurrences"
ON public.occurrences;

CREATE POLICY "Authorized users can update occurrences"
ON public.occurrences FOR UPDATE TO authenticated
USING (
  public.current_user_role() IN (
    'administrador',
    'administracao',
    'manutencao'
  )
  OR responsible_id = public.current_profile_id()
  OR reporter_id = public.current_profile_id()
)
WITH CHECK (
  public.current_user_role() IN (
    'administrador',
    'administracao',
    'manutencao',
    'limpeza'
  )
);
