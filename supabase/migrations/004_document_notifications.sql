-- Allow authenticated users to create documents and authorized users to remove them.
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.documents;
CREATE POLICY "Authenticated users can create documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins and creators can delete documents" ON public.documents;
CREATE POLICY "Admins and creators can delete documents"
ON public.documents FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('administrador', 'administracao')
  )
);

-- Persist one notification for every active administrator/administration profile.
CREATE OR REPLACE FUNCTION public.notify_document_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    recipient_id, title, message, type,
    related_entity_type, related_entity_id, action_url
  )
  SELECT
    p.user_id,
    'Novo documento cadastrado',
    'O documento "' || NEW.title || '" foi adicionado ao sistema.',
    'document_created',
    'document',
    NEW.id,
    '/documentos'
  FROM public.profiles p
  WHERE p.role IN ('administrador', 'administracao')
    AND p.is_active = TRUE
    AND p.user_id IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_document_created ON public.documents;
CREATE TRIGGER notify_on_document_created
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document_created();

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Enable realtime delivery while keeping notifications persisted in the table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
