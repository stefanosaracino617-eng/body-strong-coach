
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _primo_gestore boolean := NOT EXISTS (
    SELECT 1 FROM public.ruoli_utente WHERE ruolo = 'gestore'::public.ruolo_app
  );
BEGIN
  INSERT INTO public.profili (id, nome, cognome, email, telefono, data_nascita, sesso, stato, consenso_privacy, data_consenso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'cognome', ''),
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data ->> 'telefono', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'data_nascita', '')::date,
    NULLIF(NEW.raw_user_meta_data ->> 'sesso', '')::public.sesso_tipo,
    CASE WHEN _primo_gestore THEN 'approvato'::public.stato_profilo ELSE 'in_attesa'::public.stato_profilo END,
    COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ruoli_utente (user_id, ruolo)
  VALUES (NEW.id, CASE WHEN _primo_gestore THEN 'gestore'::public.ruolo_app ELSE 'cliente'::public.ruolo_app END)
  ON CONFLICT (user_id, ruolo) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "gestore gestisce i ruoli" ON public.ruoli_utente;

CREATE POLICY "gestore assegna ruoli"
ON public.ruoli_utente FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE POLICY "gestore revoca ruoli altrui"
ON public.ruoli_utente FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'gestore'::public.ruolo_app)
  AND NOT (user_id = auth.uid() AND ruolo = 'gestore'::public.ruolo_app)
);

CREATE POLICY "gestore modifica ruoli altrui"
ON public.ruoli_utente FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'gestore'::public.ruolo_app)
  AND user_id <> auth.uid()
)
WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
