CREATE TYPE public.ruolo_app AS ENUM ('gestore', 'cliente');
CREATE TYPE public.stato_profilo AS ENUM ('in_attesa', 'approvato', 'sospeso');
CREATE TYPE public.sesso_tipo AS ENUM ('maschio', 'femmina', 'altro');

CREATE TABLE public.profili (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  cognome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefono TEXT,
  data_nascita DATE,
  sesso public.sesso_tipo,
  stato public.stato_profilo NOT NULL DEFAULT 'in_attesa',
  consenso_privacy BOOLEAN NOT NULL DEFAULT false,
  data_consenso TIMESTAMPTZ,
  note_gestore TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ruoli_utente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  ruolo public.ruolo_app NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ruolo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profili TO authenticated;
GRANT ALL ON public.profili TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ruoli_utente TO authenticated;
GRANT ALL ON public.ruoli_utente TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.ruolo_app)
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

ALTER TABLE public.profili ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruoli_utente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profilo proprio in lettura" ON public.profili
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profilo proprio in modifica" ON public.profili
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profilo proprio in inserimento" ON public.profili
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "gestore legge tutti i profili" ON public.profili
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore modifica tutti i profili" ON public.profili
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gestore')) WITH CHECK (public.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore elimina profili" ON public.profili
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gestore'));

CREATE POLICY "ruoli propri in lettura" ON public.ruoli_utente
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "gestore legge tutti i ruoli" ON public.ruoli_utente
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gestore'));
CREATE POLICY "gestore gestisce i ruoli" ON public.ruoli_utente
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'gestore')) WITH CHECK (public.has_role(auth.uid(), 'gestore'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
    'in_attesa',
    COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'consenso_privacy')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ruoli_utente (user_id, ruolo)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id, ruolo) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();