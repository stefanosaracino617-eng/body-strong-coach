ALTER TABLE public.profili
  ADD COLUMN IF NOT EXISTS certificato_scadenza date,
  ADD COLUMN IF NOT EXISTS consenso_avvertenze boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_consenso_avvertenze timestamptz;

CREATE OR REPLACE FUNCTION private.blocca_campi_riservati_profilo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'gestore'::public.ruolo_app) THEN
    IF NEW.stato IS DISTINCT FROM OLD.stato
       OR NEW.note_gestore IS DISTINCT FROM OLD.note_gestore
       OR NEW.certificato_scadenza IS DISTINCT FROM OLD.certificato_scadenza THEN
      RAISE EXCEPTION 'Solo il gestore può modificare stato, note_gestore e certificato_scadenza'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
  INSERT INTO public.profili (id, nome, cognome, email, telefono, data_nascita, sesso, stato, consenso_privacy, data_consenso, consenso_avvertenze, data_consenso_avvertenze)
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
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false) THEN now() ELSE NULL END,
    COALESCE((NEW.raw_user_meta_data ->> 'consenso_avvertenze')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_avvertenze')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ruoli_utente (user_id, ruolo)
  VALUES (NEW.id, CASE WHEN _primo_gestore THEN 'gestore'::public.ruolo_app ELSE 'cliente'::public.ruolo_app END)
  ON CONFLICT (user_id, ruolo) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.regole_palestra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenuto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.regole_palestra TO authenticated;
GRANT INSERT, UPDATE ON public.regole_palestra TO authenticated;
GRANT ALL ON public.regole_palestra TO service_role;

ALTER TABLE public.regole_palestra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regole in lettura" ON public.regole_palestra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestore crea regole" ON public.regole_palestra
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore modifica regole" ON public.regole_palestra
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE TRIGGER update_regole_palestra_updated_at
  BEFORE UPDATE ON public.regole_palestra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();