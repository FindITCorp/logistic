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

-- Allow anyone with a valid upload URL to write (service role used in API)
CREATE POLICY IF NOT EXISTS "invoices_service_upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'invoices');

-- Public read access
CREATE POLICY IF NOT EXISTS "invoices_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invoices');

-- Service role can delete (for cleanup)
CREATE POLICY IF NOT EXISTS "invoices_service_delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'invoices');

-- Add ADMIN_SETUP_KEY hint to admin_users comment
COMMENT ON TABLE admin_users IS
  'Admin accounts. First account created via POST /api/admin/setup with ADMIN_SETUP_KEY env var.';
