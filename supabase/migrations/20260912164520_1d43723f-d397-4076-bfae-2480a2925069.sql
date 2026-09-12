CREATE TABLE public.obiettivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descrizione text,
  gruppo text NOT NULL DEFAULT 'generale',
  ordine integer NOT NULL DEFAULT 0,
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obiettivi TO authenticated;
GRANT ALL ON public.obiettivi TO service_role;

ALTER TABLE public.obiettivi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo obiettivi in lettura"
  ON public.obiettivi FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestore crea obiettivi"
  ON public.obiettivi FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore modifica obiettivi"
  ON public.obiettivi FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore elimina obiettivi"
  ON public.obiettivi FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_obiettivi_updated_at
  BEFORE UPDATE ON public.obiettivi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cliente_obiettivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obiettivo_id uuid NOT NULL REFERENCES public.obiettivi(id) ON DELETE CASCADE,
  data_selezione timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, obiettivo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_obiettivi TO authenticated;
GRANT ALL ON public.cliente_obiettivi TO service_role;

ALTER TABLE public.cliente_obiettivi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "obiettivi propri in lettura"
  ON public.cliente_obiettivi FOR SELECT TO authenticated
  USING (auth.uid() = cliente_id);
CREATE POLICY "obiettivi propri in inserimento"
  ON public.cliente_obiettivi FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "obiettivi propri in cancellazione"
  ON public.cliente_obiettivi FOR DELETE TO authenticated
  USING (auth.uid() = cliente_id);
CREATE POLICY "gestore legge tutti gli obiettivi clienti"
  ON public.cliente_obiettivi FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore gestisce obiettivi clienti"
  ON public.cliente_obiettivi FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));
CREATE POLICY "gestore rimuove obiettivi clienti"
  ON public.cliente_obiettivi FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE INDEX idx_cliente_obiettivi_cliente ON public.cliente_obiettivi (cliente_id);

INSERT INTO public.obiettivi (nome, descrizione, gruppo, ordine) VALUES
  ('Aumento massa muscolare', 'Crescita del volume muscolare complessivo', 'generale', 10),
  ('Forza', 'Incremento della forza massimale', 'generale', 20),
  ('Definizione', 'Riduzione del grasso mantenendo la massa muscolare', 'generale', 30),
  ('Dimagrimento', 'Perdita di peso e riduzione del grasso corporeo', 'generale', 40),
  ('Tonificazione generale', 'Tono muscolare e benessere generale', 'generale', 50),
  ('Pettorali', 'Sviluppo dei muscoli pettorali', 'zona', 60),
  ('Dorsali', 'Sviluppo della schiena', 'zona', 70),
  ('Spalle', 'Sviluppo di spalle e trapezio', 'zona', 80),
  ('Braccia', 'Sviluppo di bicipiti e tricipiti', 'zona', 90),
  ('Gambe e glutei', 'Sviluppo di gambe e glutei', 'zona', 100),
  ('Addominali', 'Rinforzo della fascia addominale', 'zona', 110),
  ('Postura e mobilita', 'Miglioramento di postura e mobilita articolare', 'benessere', 120);