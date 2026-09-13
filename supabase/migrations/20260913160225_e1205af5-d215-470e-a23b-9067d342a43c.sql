CREATE TABLE public.allenamenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheda_id uuid REFERENCES public.schede(id) ON DELETE SET NULL,
  sessione text NOT NULL DEFAULT '',
  data date NOT NULL DEFAULT CURRENT_DATE,
  completato_at timestamptz,
  note_cliente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX allenamenti_cliente_data_idx ON public.allenamenti (cliente_id, data DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allenamenti TO authenticated;
GRANT ALL ON public.allenamenti TO service_role;
ALTER TABLE public.allenamenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allenamenti propri in lettura" ON public.allenamenti FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "allenamenti propri in inserimento" ON public.allenamenti FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "allenamenti propri in modifica" ON public.allenamenti FOR UPDATE TO authenticated USING (auth.uid() = cliente_id) WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "allenamenti propri in cancellazione" ON public.allenamenti FOR DELETE TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "gestore legge tutti gli allenamenti" ON public.allenamenti FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE TRIGGER update_allenamenti_updated_at BEFORE UPDATE ON public.allenamenti
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.allenamento_esercizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allenamento_id uuid NOT NULL REFERENCES public.allenamenti(id) ON DELETE CASCADE,
  scheda_esercizio_id uuid REFERENCES public.scheda_esercizi(id) ON DELETE SET NULL,
  completato boolean NOT NULL DEFAULT false,
  peso_kg numeric(6,2),
  ripetizioni_effettive text,
  durata_minuti integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (allenamento_id, scheda_esercizio_id)
);

CREATE INDEX allenamento_esercizi_allenamento_idx ON public.allenamento_esercizi (allenamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allenamento_esercizi TO authenticated;
GRANT ALL ON public.allenamento_esercizi TO service_role;
ALTER TABLE public.allenamento_esercizi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "righe allenamento proprie in lettura" ON public.allenamento_esercizi FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.allenamenti a WHERE a.id = allenamento_id AND a.cliente_id = auth.uid()));
CREATE POLICY "righe allenamento proprie in inserimento" ON public.allenamento_esercizi FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.allenamenti a WHERE a.id = allenamento_id AND a.cliente_id = auth.uid()));
CREATE POLICY "righe allenamento proprie in modifica" ON public.allenamento_esercizi FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.allenamenti a WHERE a.id = allenamento_id AND a.cliente_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.allenamenti a WHERE a.id = allenamento_id AND a.cliente_id = auth.uid()));
CREATE POLICY "righe allenamento proprie in cancellazione" ON public.allenamento_esercizi FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.allenamenti a WHERE a.id = allenamento_id AND a.cliente_id = auth.uid()));
CREATE POLICY "gestore legge tutte le righe allenamento" ON public.allenamento_esercizi FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE TRIGGER update_allenamento_esercizi_updated_at BEFORE UPDATE ON public.allenamento_esercizi
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();