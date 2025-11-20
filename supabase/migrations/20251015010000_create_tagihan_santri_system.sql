-- Migration: Create tagihan santri system
-- Date: 2025-10-15
-- Purpose: Create tables for managing santri billing (for Reguler/Mahasiswa)

-- Create tagihan_santri table
CREATE TABLE IF NOT EXISTS public.tagihan_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  
  -- Billing info
  periode VARCHAR(20) NOT NULL, -- Format: YYYY-MM (e.g., 2025-01)
  tahun_ajaran VARCHAR(20), -- Format: 2024/2025
  bulan VARCHAR(20) NOT NULL, -- Nama bulan: Januari, Februari, dst
  
  -- Amount
  komponen_tagihan JSONB, -- Detail komponen: {spp: 300000, buku: 100000, ...}
  total_tagihan DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_dibayar DECIMAL(15,2) NOT NULL DEFAULT 0,
  sisa_tagihan DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar', 'dibayar_sebagian', 'lunas', 'terlambat')),
  tanggal_jatuh_tempo DATE,
  
  -- Payment tracking
  tanggal_bayar DATE,
  metode_pembayaran VARCHAR(100),
  bukti_pembayaran TEXT,
  catatan TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_santri_id ON public.tagihan_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_periode ON public.tagihan_santri(periode);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_status ON public.tagihan_santri(status);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_jatuh_tempo ON public.tagihan_santri(tanggal_jatuh_tempo);

-- Create pembayaran_santri table (for payment history)
CREATE TABLE IF NOT EXISTS public.pembayaran_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id UUID NOT NULL REFERENCES public.tagihan_santri(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  
  -- Payment info
  jumlah_bayar DECIMAL(15,2) NOT NULL,
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  metode_pembayaran VARCHAR(100) NOT NULL,
  nomor_referensi VARCHAR(100),
  bukti_pembayaran TEXT,
  catatan TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for pembayaran
CREATE INDEX IF NOT EXISTS idx_pembayaran_tagihan_id ON public.pembayaran_santri(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_santri_id ON public.pembayaran_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_tanggal ON public.pembayaran_santri(tanggal_bayar);

-- Add comments
COMMENT ON TABLE public.tagihan_santri IS 'Tagihan bulanan untuk santri Reguler/Mahasiswa';
COMMENT ON TABLE public.pembayaran_santri IS 'History pembayaran tagihan santri';

COMMENT ON COLUMN public.tagihan_santri.periode IS 'Format: YYYY-MM (e.g., 2025-01)';
COMMENT ON COLUMN public.tagihan_santri.komponen_tagihan IS 'JSONB: {spp: 300000, buku: 100000, seragam: 150000}';
COMMENT ON COLUMN public.tagihan_santri.status IS 'Status pembayaran: belum_bayar, dibayar_sebagian, lunas, terlambat';

-- Create function to auto-update sisa_tagihan
CREATE OR REPLACE FUNCTION auto_update_sisa_tagihan()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sisa_tagihan = NEW.total_tagihan - NEW.total_dibayar;
  
  -- Auto-update status based on payment
  IF NEW.total_dibayar >= NEW.total_tagihan THEN
    NEW.status = 'lunas';
  ELSIF NEW.total_dibayar > 0 THEN
    NEW.status = 'dibayar_sebagian';
  ELSIF NEW.tanggal_jatuh_tempo IS NOT NULL AND NEW.tanggal_jatuh_tempo < CURRENT_DATE THEN
    NEW.status = 'terlambat';
  ELSE
    NEW.status = 'belum_bayar';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_update_sisa_tagihan ON public.tagihan_santri;
CREATE TRIGGER trigger_auto_update_sisa_tagihan
  BEFORE INSERT OR UPDATE ON public.tagihan_santri
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_sisa_tagihan();

-- Create function to auto-update tagihan when payment is made
CREATE OR REPLACE FUNCTION auto_update_tagihan_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_dibayar in tagihan_santri
  UPDATE public.tagihan_santri
  SET 
    total_dibayar = total_dibayar + NEW.jumlah_bayar,
    tanggal_bayar = NEW.tanggal_bayar,
    metode_pembayaran = NEW.metode_pembayaran,
    updated_at = NOW()
  WHERE id = NEW.tagihan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment
DROP TRIGGER IF EXISTS trigger_auto_update_tagihan_on_payment ON public.pembayaran_santri;
CREATE TRIGGER trigger_auto_update_tagihan_on_payment
  AFTER INSERT ON public.pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_tagihan_on_payment();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tagihan_santri TO authenticated;
GRANT SELECT, INSERT ON public.pembayaran_santri TO authenticated;

