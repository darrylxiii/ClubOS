-- Drop existing problematic storage policies for message-attachments
DROP POLICY IF EXISTS "Users can upload attachments to their messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;

-- Create security definer function to check conversation access
CREATE OR REPLACE FUNCTION public.can_access_conversation_storage(
  _conversation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

-- Create security definer function to check if user owns a message attachment
CREATE OR REPLACE FUNCTION public.owns_message_attachment(
  _file_path text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.message_attachments ma
    JOIN public.messages m ON m.id = ma.message_id
    WHERE ma.file_path = _file_path
      AND m.sender_id = auth.uid()
  );
$$;

-- Recreate storage policies using security definer functions
CREATE POLICY "Users can upload attachments to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (
    public.can_access_conversation_storage(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can view attachments in their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    public.can_access_conversation_storage(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND (
    public.owns_message_attachment(name)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their own message attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'message-attachments'
  AND (
    public.owns_message_attachment(name)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);