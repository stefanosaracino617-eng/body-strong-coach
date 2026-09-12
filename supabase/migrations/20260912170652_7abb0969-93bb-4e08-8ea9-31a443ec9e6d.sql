CREATE POLICY "immagini esercizi in lettura" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'esercizi');

CREATE POLICY "gestore carica immagini esercizi" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'esercizi' AND private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE POLICY "gestore aggiorna immagini esercizi" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'esercizi' AND private.has_role(auth.uid(), 'gestore'::public.ruolo_app))
WITH CHECK (bucket_id = 'esercizi' AND private.has_role(auth.uid(), 'gestore'::public.ruolo_app));

CREATE POLICY "gestore elimina immagini esercizi" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'esercizi' AND private.has_role(auth.uid(), 'gestore'::public.ruolo_app));