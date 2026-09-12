CREATE OR REPLACE FUNCTION private.blocca_campi_riservati_profilo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'gestore'::public.ruolo_app) THEN
    IF NEW.stato IS DISTINCT FROM OLD.stato
       OR NEW.note_gestore IS DISTINCT FROM OLD.note_gestore THEN
      RAISE EXCEPTION 'Solo il gestore può modificare stato e note_gestore'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.blocca_campi_riservati_profilo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.blocca_campi_riservati_profilo() FROM anon, authenticated;

DROP TRIGGER IF EXISTS guardia_campi_riservati_profilo ON public.profili;
CREATE TRIGGER guardia_campi_riservati_profilo
BEFORE UPDATE ON public.profili
FOR EACH ROW EXECUTE FUNCTION private.blocca_campi_riservati_profilo();