CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _e_gestore boolean := lower(COALESCE(NEW.email, '')) = 'stefanosaracino617@gmail.com';
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
    CASE WHEN _e_gestore THEN 'approvato'::public.stato_profilo ELSE 'in_attesa'::public.stato_profilo END,
    COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ruoli_utente (user_id, ruolo)
  VALUES (NEW.id, CASE WHEN _e_gestore THEN 'gestore'::public.ruolo_app ELSE 'cliente'::public.ruolo_app END)
  ON CONFLICT (user_id, ruolo) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;