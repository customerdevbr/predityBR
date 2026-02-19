-- FIX: Add attachment_url to support_messages AND Create Storage Bucket

-- 1. Add Column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_messages' AND column_name = 'attachment_url') THEN
        ALTER TABLE support_messages ADD COLUMN attachment_url TEXT;
    END IF;
END $$;

-- 2. Create Bucket (If possible via SQL, otherwise User must do strictly manually)
-- Note: Creating buckets via SQL requires pg_net or special permissions usually.
-- We will try to insert into storage.buckets if the extension allows, else ignore.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Allow Authenticated Users to Upload
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'support-attachments' 
    AND auth.role() = 'authenticated'
);

-- Allow Public Access to Read (Or restrict to own? Public is easier for Admin/User sharing without signed URLs complexity for now)
CREATE POLICY "Public can view support attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments');
