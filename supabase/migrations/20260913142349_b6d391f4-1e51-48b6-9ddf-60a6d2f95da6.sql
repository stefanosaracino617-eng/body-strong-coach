CREATE TYPE public.stato_scheda AS ENUM ('attiva', 'archiviata');

CREATE TABLE public.schede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo text NOT NULL DEFAULT '',
  data_inizio date NOT NULL DEFAULT CURRENT_DATE,
  data_scadenza date NOT NULL,
  stato public.stato_scheda NOT NULL DEFAULT 'attiva',
  note_gestore text,
  archiviata_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schede TO authenticated;
GRANT ALL ON public.schede TO service_role;

ALTER TABLE public.schede ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX schede_una_attiva_per_cliente
  ON public.schede (cliente_id) WHERE stato = 'attiva';
CREATE INDEX schede_cliente_idx ON public.schede (cliente_id);

CREATE POLICY "gestore legge tutte le schede" ON public.schede
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore crea schede" ON public.schede
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore modifica schede" ON public.schede
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore elimina schede" ON public.schede
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "schede proprie in lettura" ON public.schede
  FOR SELECT TO authenticated USING (auth.uid() = cliente_id);

CREATE TRIGGER update_schede_updated_at
  BEFORE UPDATE ON public.schede
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.scheda_esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheda_id uuid NOT NULL REFERENCES public.schede(id) ON DELETE CASCADE,
  esercizio_id uuid REFERENCES public.esercizi(id) ON DELETE SET NULL,
  nome_libero text,
  descrizione_libera text,
  immagine_libera_url text,
  sessione text NOT NULL DEFAULT '',
  ordine integer NOT NULL DEFAULT 0,
  serie integer,
  ripetizioni text,
  durata_minuti integer,
  recupero_secondi integer,
  carico_indicativo text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheda_esercizi TO authenticated;
GRANT ALL ON public.scheda_esercizi TO service_role;

ALTER TABLE public.scheda_esercizi ENABLE ROW LEVEL SECURITY;

CREATE INDEX scheda_esercizi_scheda_idx ON public.scheda_esercizi (scheda_id, ordine);

CREATE POLICY "gestore legge esercizi scheda" ON public.scheda_esercizi
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore crea esercizi scheda" ON public.scheda_esercizi
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore modifica esercizi scheda" ON public.scheda_esercizi
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore elimina esercizi scheda" ON public.scheda_esercizi
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "esercizi delle proprie schede in lettura" ON public.scheda_esercizi
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.schede s WHERE s.id = scheda_esercizi.scheda_id AND s.cliente_id = auth.uid()
  ));

CREATE TRIGGER update_scheda_esercizi_updated_at
  BEFORE UPDATE ON public.scheda_esercizi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();