ALTER TABLE public.profili
  ADD COLUMN IF NOT EXISTS tipo_abbonamento text,
  ADD COLUMN IF NOT EXISTS abbonamento_inizio date,
  ADD COLUMN IF NOT EXISTS abbonamento_scadenza date,
  ADD COLUMN IF NOT EXISTS data_approvazione timestamptz;

CREATE OR REPLACE FUNCTION private.blocca_campi_riservati_profilo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'gestore'::public.ruolo_app) THEN
    IF NEW.stato IS DISTINCT FROM OLD.stato
       OR NEW.note_gestore IS DISTINCT FROM OLD.note_gestore
       OR NEW.certificato_scadenza IS DISTINCT FROM OLD.certificato_scadenza
       OR NEW.tipo_abbonamento IS DISTINCT FROM OLD.tipo_abbonamento
       OR NEW.abbonamento_inizio IS DISTINCT FROM OLD.abbonamento_inizio
       OR NEW.abbonamento_scadenza IS DISTINCT FROM OLD.abbonamento_scadenza
       OR NEW.data_approvazione IS DISTINCT FROM OLD.data_approvazione THEN
      RAISE EXCEPTION 'Solo il gestore può modificare i campi riservati del profilo'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.registra_data_approvazione()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stato = 'approvato'::public.stato_profilo
     AND OLD.stato IS DISTINCT FROM 'approvato'::public.stato_profilo
     AND NEW.data_approvazione IS NULL THEN
    NEW.data_approvazione := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS registra_data_approvazione ON public.profili;
CREATE TRIGGER registra_data_approvazione
BEFORE UPDATE ON public.profili
FOR EACH ROW EXECUTE FUNCTION private.registra_data_approvazione();

SELECT cron.unschedule('archivia-schede-scadute')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archivia-schede-scadute');

DROP FUNCTION IF EXISTS public.archivia_schede_scadute();

DROP POLICY IF EXISTS "schede proprie in lettura" ON public.schede;
CREATE POLICY "schede proprie in lettura"
ON public.schede
FOR SELECT
TO authenticated
USING (
  auth.uid() = cliente_id
  AND (
    (
      stato = 'attiva'::public.stato_scheda
      AND data_inizio <= (now() AT TIME ZONE 'Europe/Rome')::date
      AND NOT EXISTS (
        SELECT 1 FROM public.profili p
        WHERE p.id = auth.uid()
          AND p.abbonamento_scadenza IS NOT NULL
          AND p.abbonamento_scadenza < ((now() AT TIME ZONE 'Europe/Rome')::date - 7)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.allenamenti a
      WHERE a.scheda_id = schede.id AND a.cliente_id = auth.uid()
    )
  )
);