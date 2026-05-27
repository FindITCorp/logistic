-- Migration 009: Supabase Storage bucket for invoice uploads

-- Create the invoices storage bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  5242880,  -- 5 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies (idempotent via DO block — CREATE POLICY has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'invoices_service_upload'
  ) THEN
    CREATE POLICY "invoices_service_upload"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'invoices');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'invoices_public_read'
  ) THEN
    CREATE POLICY "invoices_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'invoices');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'invoices_service_delete'
  ) THEN
    CREATE POLICY "invoices_service_delete"
    ON storage.objects FOR DELETE
    TO service_role
    USING (bucket_id = 'invoices');
  END IF;
END $$;

COMMENT ON TABLE admin_users IS
  'Admin accounts. First account created via POST /api/admin/setup with ADMIN_SETUP_KEY env var.';
