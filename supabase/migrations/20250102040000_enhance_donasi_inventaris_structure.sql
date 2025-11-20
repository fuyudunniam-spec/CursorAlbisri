-- Update donasi table to match requirements
ALTER TABLE donasi 
ADD COLUMN IF NOT EXISTS hajat_doa TEXT,
ADD COLUMN IF NOT EXISTS catatan TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual' CHECK (source IN ('Donasi', 'Manual'));

-- Update inventaris table to match requirements  
ALTER TABLE inventaris
ADD COLUMN IF NOT EXISTS tipe VARCHAR(50) DEFAULT 'Aset' CHECK (tipe IN ('Aset', 'Komoditas')),
ADD COLUMN IF NOT EXISTS satuan VARCHAR(50),
ADD COLUMN IF NOT EXISTS harga NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS perishable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tanggal_kedaluwarsa DATE,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Manual' CHECK (source IN ('Donasi', 'Manual'));

-- Create transaksi table for inventory transactions
CREATE TABLE IF NOT EXISTS transaksi_inventaris (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventaris(id) ON DELETE CASCADE,
    jumlah INTEGER NOT NULL,
    harga NUMERIC(15,2),
    tipe VARCHAR(50) NOT NULL CHECK (tipe IN ('Jual', 'Distribusi')),
    penerima VARCHAR(255),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_donasi_tanggal ON donasi(tanggal_donasi);
CREATE INDEX IF NOT EXISTS idx_donasi_jenis ON donasi(jenis_donasi);
CREATE INDEX IF NOT EXISTS idx_inventaris_tipe ON inventaris(tipe);
CREATE INDEX IF NOT EXISTS idx_inventaris_kategori ON inventaris(kategori);
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_item ON transaksi_inventaris(item_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_tanggal ON transaksi_inventaris(tanggal);

-- Add RLS policies
ALTER TABLE donasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventaris ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_inventaris ENABLE ROW LEVEL SECURITY;

-- Donasi policies
CREATE POLICY "Users can view donasi" ON donasi FOR SELECT USING (true);
CREATE POLICY "Admin can manage donasi" ON donasi FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    )
);

-- Inventaris policies  
CREATE POLICY "Users can view inventaris" ON inventaris FOR SELECT USING (true);
CREATE POLICY "Admin can manage inventaris" ON inventaris FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    )
);

-- Transaksi inventaris policies
CREATE POLICY "Users can view transaksi_inventaris" ON transaksi_inventaris FOR SELECT USING (true);
CREATE POLICY "Admin can manage transaksi_inventaris" ON transaksi_inventaris FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    )
);

-- Function to auto-add donasi barang to inventaris
CREATE OR REPLACE FUNCTION auto_add_donasi_barang_to_inventaris()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if jenis_donasi is 'Barang'
    IF NEW.jenis_donasi = 'Barang' THEN
        INSERT INTO inventaris (
            nama_barang,
            tipe,
            kategori,
            lokasi,
            kondisi,
            jumlah,
            satuan,
            harga,
            perishable,
            tanggal_kedaluwarsa,
            source,
            keterangan,
            created_at,
            created_by
        ) VALUES (
            COALESCE(NEW.deskripsi, 'Barang Donasi'),
            'Aset', -- Default to Aset for donated items
            'Donasi',
            'Gudang',
            'Baik',
            1, -- Default quantity
            'unit',
            NULL, -- No price for donated items
            false,
            NULL,
            'Donasi',
            CONCAT('Donasi dari: ', NEW.nama_donatur, CASE WHEN NEW.hajat_doa IS NOT NULL THEN CONCAT(' - ', NEW.hajat_doa) ELSE '' END),
            NOW(),
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add donasi barang to inventaris
CREATE TRIGGER trigger_auto_add_donasi_barang_to_inventaris
    AFTER INSERT ON donasi
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_donasi_barang_to_inventaris();

-- Function to auto-add donasi uang to keuangan
CREATE OR REPLACE FUNCTION auto_add_donasi_uang_to_keuangan()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if jenis_donasi is 'Uang'
    IF NEW.jenis_donasi = 'Uang' AND NEW.jumlah IS NOT NULL THEN
        INSERT INTO keuangan (
            jenis_transaksi,
            kategori,
            jumlah,
            tanggal,
            deskripsi,
            referensi,
            created_at,
            created_by
        ) VALUES (
            'Pemasukan',
            'Donasi',
            NEW.jumlah,
            COALESCE(NEW.tanggal_diterima, NEW.tanggal_donasi),
            CONCAT('Donasi dari: ', NEW.nama_donatur, CASE WHEN NEW.hajat_doa IS NOT NULL THEN CONCAT(' - ', NEW.hajat_doa) ELSE '' END),
            'donasi',
            NOW(),
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add donasi uang to keuangan
CREATE TRIGGER trigger_auto_add_donasi_uang_to_keuangan
    AFTER INSERT ON donasi
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_donasi_uang_to_keuangan();
