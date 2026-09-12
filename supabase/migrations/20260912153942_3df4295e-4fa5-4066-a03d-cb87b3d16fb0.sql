CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.ruolo_app)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ruoli_utente
    WHERE user_id = _user_id AND ruolo = _role
  )
$$;

DROP POLICY "gestore legge tutti i profili" ON public.profili;
DROP POLICY "gestore modifica tutti i profili" ON public.profili;
DROP POLICY "gestore elimina profili" ON public.profili;
DROP POLICY "gestore legge tutti i ruoli" ON public.ruoli_utente;
DROP POLICY "gestore gestisce i ruoli" ON public.ruoli_utente;

CREATE POLICY "gestore legge tutti i profili" ON public.profili
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore modifica tutti i profili" ON public.profili
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'gestore')) WITH CHECK (private.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore elimina profili" ON public.profili
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore legge tutti i ruoli" ON public.ruoli_utente
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore gestisce i ruoli" ON public.ruoli_utente
  FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'gestore')) WITH CHECK (private.has_role(auth.uid(), 'gestore'));

DROP FUNCTION public.has_role(uuid, public.ruolo_app);
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;