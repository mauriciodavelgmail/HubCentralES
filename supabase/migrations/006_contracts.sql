CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number TEXT NOT NULL UNIQUE,
  supplier TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value NUMERIC(14, 2),
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'vencendo', 'vencido', 'encerrado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT contracts_date_order CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON public.contracts(supplier);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contract managers can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Contract managers can create contracts"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Contract managers can update contracts"
ON public.contracts FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('administrador', 'administracao'))
WITH CHECK (public.current_user_role() IN ('administrador', 'administracao'));
CREATE POLICY "Administrators can delete contracts"
ON public.contracts FOR DELETE TO authenticated
USING (public.current_user_role() = 'administrador');

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_changes
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();

