
CREATE TABLE public.password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  event text NOT NULL CHECK (event IN ('requested','completed')),
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.password_reset_audit TO authenticated;
GRANT ALL ON public.password_reset_audit TO service_role;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.password_reset_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
