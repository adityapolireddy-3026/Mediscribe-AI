CREATE POLICY "Doctors read own consultation audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doctors upload own consultation audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doctors delete own consultation audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consultation-audio' AND (storage.foldername(name))[1] = auth.uid()::text);