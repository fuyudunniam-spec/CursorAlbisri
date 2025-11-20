-- Update app_role enum to include module-specific admin roles
-- This migration adds admin_keuangan, admin_inventaris, and admin_akademik roles

-- Note: ALTER TYPE ADD VALUE cannot be rolled back, but we use IF NOT EXISTS pattern
-- to make migration idempotent

-- Add admin_keuangan role
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin_keuangan' 
        AND enumtypid = 'app_role'::regtype
    ) THEN
        ALTER TYPE app_role ADD VALUE 'admin_keuangan';
    END IF;
END $$;

-- Add admin_inventaris role
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin_inventaris' 
        AND enumtypid = 'app_role'::regtype
    ) THEN
        ALTER TYPE app_role ADD VALUE 'admin_inventaris';
    END IF;
END $$;

-- Add admin_akademik role
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin_akademik' 
        AND enumtypid = 'app_role'::regtype
    ) THEN
        ALTER TYPE app_role ADD VALUE 'admin_akademik';
    END IF;
END $$;

-- Verify enum values
SELECT enumlabel as role_name 
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype 
ORDER BY enumsortorder;

