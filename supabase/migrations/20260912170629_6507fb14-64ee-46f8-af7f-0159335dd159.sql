CREATE TYPE public.gruppo_muscolare AS ENUM ('cardio','pettorali','spalle e trapezio','bicipiti e brachiale','tricipiti','dorsali','gambe e glutei','polpacci','addominali');
CREATE TYPE public.tipo_esercizio AS ENUM ('forza','cardio');
CREATE TYPE public.unita_misura_esercizio AS ENUM ('serie_ripetizioni','minuti');

CREATE TABLE public.esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  gruppo_muscolare public.gruppo_muscolare NOT NULL,
  attrezzatura text,
  tipo public.tipo_esercizio NOT NULL DEFAULT 'forza',
  unita_misura public.unita_misura_esercizio NOT NULL DEFAULT 'serie_ripetizioni',
  descrizione_esecuzione text,
  errori_comuni text,
  immagine_url text,
  attivo boolean NOT NULL DEFAULT true,
  ordine integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esercizi_ordine_unico UNIQUE (ordine)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.esercizi TO authenticated;
GRANT ALL ON public.esercizi TO service_role;

ALTER TABLE public.esercizi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo esercizi in lettura" ON public.esercizi
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'gestore'::public.ruolo_app)
  OR EXISTS (
    SELECT 1 FROM public.profili p
    WHERE p.id = auth.uid() AND p.stato = 'approvato'::public.stato_profilo
  )
);

CREATE POLICY "gestore crea esercizi" ON public.esercizi
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE POLICY "gestore modifica esercizi" ON public.esercizi
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE POLICY "gestore elimina esercizi" ON public.esercizi
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE INDEX esercizi_gruppo_idx ON public.esercizi (gruppo_muscolare);

CREATE TRIGGER update_esercizi_updated_at
BEFORE UPDATE ON public.esercizi
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();