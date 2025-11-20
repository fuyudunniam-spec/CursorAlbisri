-- Fix program schema cache issue
-- Apply this in Supabase SQL Editor

-- Force refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify santri_programs table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'santri_programs' 
ORDER BY ordinal_position;

-- If program_id column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'santri_programs' 
        AND column_name = 'program_id'
    ) THEN
        ALTER TABLE santri_programs ADD COLUMN program_id UUID REFERENCES program_santri(id);
        RAISE NOTICE 'Added program_id column to santri_programs';
    ELSE
        RAISE NOTICE 'program_id column already exists in santri_programs';
    END IF;
END $$;

-- If kelas_program column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'santri_programs' 
        AND column_name = 'kelas_program'
    ) THEN
        ALTER TABLE santri_programs ADD COLUMN kelas_program VARCHAR(100);
        RAISE NOTICE 'Added kelas_program column to santri_programs';
    ELSE
        RAISE NOTICE 'kelas_program column already exists in santri_programs';
    END IF;
END $$;

-- If rombel column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'santri_programs' 
        AND column_name = 'rombel'
    ) THEN
        ALTER TABLE santri_programs ADD COLUMN rombel VARCHAR(50);
        RAISE NOTICE 'Added rombel column to santri_programs';
    ELSE
        RAISE NOTICE 'rombel column already exists in santri_programs';
    END IF;
END $$;

-- Force refresh schema cache again
NOTIFY pgrst, 'reload schema';

-- Final verification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'santri_programs' 
ORDER BY ordinal_position;
