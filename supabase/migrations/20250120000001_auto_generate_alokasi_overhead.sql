-- Function to auto-generate alokasi for current month when overhead expense is added
CREATE OR REPLACE FUNCTION trigger_auto_generate_alokasi()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for Pengeluaran with jenis_alokasi = 'overhead' and status = 'posted'
  IF NEW.jenis_transaksi = 'Pengeluaran' 
     AND NEW.jenis_alokasi = 'overhead' 
     AND NEW.status = 'posted' 
  THEN
    -- Extract month and year from transaction date
    PERFORM generate_alokasi_overhead(
      EXTRACT(MONTH FROM NEW.tanggal)::INT,
      EXTRACT(YEAR FROM NEW.tanggal)::INT
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_generate_alokasi_on_overhead ON keuangan;
CREATE TRIGGER auto_generate_alokasi_on_overhead
  AFTER INSERT OR UPDATE ON keuangan
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_generate_alokasi();

-- Also trigger on update (e.g., when status changes to 'posted')
COMMENT ON TRIGGER auto_generate_alokasi_on_overhead ON keuangan IS 
  'Auto-generate monthly alokasi overhead whenever overhead expense is posted';
