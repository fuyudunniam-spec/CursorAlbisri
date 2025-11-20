-- Migration: Add approval workflow to santri table
-- Date: 2025-10-15
-- Purpose: Add status_approval and related fields for santri approval workflow

-- Add new columns to santri table
ALTER TABLE public.santri
ADD COLUMN IF NOT EXISTS status_approval VARCHAR(50) DEFAULT 'pending' CHECK (status_approval IN ('pending', 'disetujui', 'ditolak')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS catatan_approval TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS catatan_penolakan TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_santri_status_approval ON public.santri(status_approval);
CREATE INDEX IF NOT EXISTS idx_santri_approved_at ON public.santri(approved_at);

-- Add comments for documentation
COMMENT ON COLUMN public.santri.status_approval IS 'Status approval santri: pending (menunggu), disetujui (approved), ditolak (rejected)';
COMMENT ON COLUMN public.santri.approved_at IS 'Timestamp when santri was approved';
COMMENT ON COLUMN public.santri.approved_by IS 'User ID who approved the santri';
COMMENT ON COLUMN public.santri.catatan_approval IS 'Admin notes when approving santri';
COMMENT ON COLUMN public.santri.rejected_at IS 'Timestamp when santri was rejected';
COMMENT ON COLUMN public.santri.rejected_by IS 'User ID who rejected the santri';
COMMENT ON COLUMN public.santri.catatan_penolakan IS 'Admin notes when rejecting santri';

-- Update existing santri to 'disetujui' (assume all existing santri are already approved)
UPDATE public.santri
SET status_approval = 'disetujui',
    approved_at = created_at
WHERE status_approval IS NULL OR status_approval = 'pending';

-- Create function to auto-set approved_at when status changes to 'disetujui'
CREATE OR REPLACE FUNCTION auto_set_approval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'disetujui'
  IF NEW.status_approval = 'disetujui' AND OLD.status_approval != 'disetujui' THEN
    NEW.approved_at = NOW();
  END IF;
  
  -- When status changes to 'ditolak'
  IF NEW.status_approval = 'ditolak' AND OLD.status_approval != 'ditolak' THEN
    NEW.rejected_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-setting timestamps
DROP TRIGGER IF EXISTS trigger_auto_set_approval_timestamp ON public.santri;
CREATE TRIGGER trigger_auto_set_approval_timestamp
  BEFORE UPDATE ON public.santri
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_approval_timestamp();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.santri TO authenticated;

