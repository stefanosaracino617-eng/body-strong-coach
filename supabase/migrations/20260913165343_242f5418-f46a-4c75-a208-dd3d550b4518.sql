CREATE TABLE IF NOT EXISTS public.log_archiviazione_schede (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eseguita_at timestamptz NOT NULL DEFAULT now(),
  schede_archiviate integer NOT NULL DEFAULT 0,
  errore text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.log_archiviazione_schede TO authenticated;
GRANT ALL ON public.log_archiviazione_schede TO service_role;

ALTER TABLE public.log_archiviazione_schede ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestore legge il registro archiviazioni"
ON public.log_archiviazione_schede
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE OR REPLACE FUNCTION public.archivia_schede_scadute()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
BEGIN
  UPDATE public.schede
     SET stato = 'archiviata'::public.stato_scheda,
         archiviata_at = COALESCE(archiviata_at, now())
   WHERE stato = 'attiva'::public.stato_scheda
     AND data_scadenza < (now() AT TIME ZONE 'Europe/Rome')::date;
  GET DIAGNOSTICS _n = ROW_COUNT;

  INSERT INTO public.log_archiviazione_schede (schede_archiviate, errore)
  VALUES (_n, NULL);

  RETURN _n;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.log_archiviazione_schede (schede_archiviate, errore)
  VALUES (0, SQLERRM);
  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.archivia_schede_scadute() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archivia_schede_scadute() TO service_role;

DROP POLICY IF EXISTS "schede proprie in lettura" ON public.schede;
CREATE POLICY "schede proprie in lettura"
ON public.schede
FOR SELECT TO authenticated
USING (
  auth.uid() = cliente_id
  AND (
    (stato = 'attiva'::public.stato_scheda
      AND data_scadenza >= (now() AT TIME ZONE 'Europe/Rome')::date)
    OR EXISTS (
      SELECT 1 FROM public.allenamenti a
       WHERE a.scheda_id = schede.id
         AND a.cliente_id = auth.uid()
    )
  )
);