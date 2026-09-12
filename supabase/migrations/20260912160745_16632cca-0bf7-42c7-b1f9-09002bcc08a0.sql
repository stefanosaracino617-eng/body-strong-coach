CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'in_attesa'::public.stato_profilo,
    COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ruoli_utente (user_id, ruolo)
  VALUES (NEW.id, 'cliente'::public.ruolo_app)
  ON CONFLICT (user_id, ruolo) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;