CREATE OR REPLACE FUNCTION private.archivia_schede_precedenti()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stato = 'attiva'::public.stato_scheda THEN
    UPDATE public.schede
       SET stato = 'archiviata'::public.stato_scheda,
           archiviata_at = now()
     WHERE cliente_id = NEW.cliente_id
       AND stato = 'attiva'::public.stato_scheda
       AND id IS DISTINCT FROM NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archivia_schede_precedenti_ins ON public.schede;
CREATE TRIGGER archivia_schede_precedenti_ins
BEFORE INSERT ON public.schede
FOR EACH ROW EXECUTE FUNCTION private.archivia_schede_precedenti();

DROP TRIGGER IF EXISTS archivia_schede_precedenti_upd ON public.schede;
CREATE TRIGGER archivia_schede_precedenti_upd
BEFORE UPDATE OF stato ON public.schede
FOR EACH ROW
WHEN (NEW.stato = 'attiva'::public.stato_scheda AND OLD.stato IS DISTINCT FROM NEW.stato)
EXECUTE FUNCTION private.archivia_schede_precedenti();