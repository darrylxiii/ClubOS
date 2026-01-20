-- Create storage policies for message attachments
CREATE POLICY "Users can view attachments in their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM public.message_attachments ma
      JOIN public.messages m ON m.id = ma.message_id
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE ma.file_path = storage.objects.name
      AND cp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can upload attachments to their messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM public.conversations c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.messages m ON m.id = ma.message_id
    WHERE ma.file_path = storage.objects.name
    AND m.sender_id = auth.uid()
  )
);