-- =====================================================
-- FIX DOKUMEN AUDIT LOG CONSTRAINT
-- =====================================================
-- Description: Fix foreign key constraint issue in dokumen_audit_log
-- Date: 2025-10-10
-- Issue: Circular dependency between dokumen_santri DELETE and dokumen_audit_log INSERT
-- =====================================================

-- =====================================================
-- 1. FIX FOREIGN KEY CONSTRAINT
-- =====================================================
-- Change from CASCADE to SET NULL to prevent circular dependency
ALTER TABLE dokumen_audit_log 
DROP CONSTRAINT IF EXISTS dokumen_audit_log_dokumen_id_fkey;

ALTER TABLE dokumen_audit_log 
ADD CONSTRAINT dokumen_audit_log_dokumen_id_fkey 
FOREIGN KEY (dokumen_id) REFERENCES dokumen_santri(id) 
ON DELETE SET NULL;

-- =====================================================
-- 2. FIX TRIGGER FUNCTION
-- =====================================================
-- Update trigger function to handle DELETE properly
CREATE OR REPLACE FUNCTION create_dokumen_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dokumen_audit_log (dokumen_id, action, performed_by, new_values)
    VALUES (NEW.id, 'CREATE', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dokumen_audit_log (dokumen_id, action, performed_by, old_values, new_values)
    VALUES (NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- For DELETE, insert with NULL dokumen_id to avoid circular dependency
    INSERT INTO dokumen_audit_log (dokumen_id, action, performed_by, old_values)
    VALUES (NULL, 'DELETE', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- =====================================================
-- 3. ADD COMMENTS
-- =====================================================
COMMENT ON CONSTRAINT dokumen_audit_log_dokumen_id_fkey ON dokumen_audit_log 
IS 'Foreign key constraint with SET NULL on delete to prevent circular dependency with trigger';

COMMENT ON FUNCTION create_dokumen_audit_log() 
IS 'Audit log function for dokumen_santri changes. Handles DELETE with NULL dokumen_id to avoid circular dependency';

-- =====================================================
-- FIX COMPLETE
-- =====================================================
