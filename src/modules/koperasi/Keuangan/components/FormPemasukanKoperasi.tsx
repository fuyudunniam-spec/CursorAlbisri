import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AkunKasService, AkunKas } from '@/services/akunKas.service';
import { addKeuanganKoperasiTransaction } from '@/services/keuanganKoperasi.service';

interface FormPemasukanKoperasiProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const KATEGORI_PEMASUKAN = [
  'Penjualan Koperasi',
  'Penjualan Inventaris',
  'Bagi Hasil',
  'Bunga Bank',
  'Hibah/Bantuan',
  'Pemasukan Lainnya'
];

const FormPemasukanKoperasi: React.FC<FormPemasukanKoperasiProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState('');
  const [subKategori, setSubKategori] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [penerimaPembayar, setPenerimaPembayar] = useState('');
  const [akunKasId, setAkunKasId] = useState<string>('');
  const [akunKasOptions, setAkunKasOptions] = useState<AkunKas[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAkunKas();
    }
  }, [isOpen]);

  const loadAkunKas = async () => {
    try {
      const accounts = await AkunKasService.getAll();
      const activeAccounts = accounts.filter(acc => acc.status === 'aktif');
      setAkunKasOptions(activeAccounts);
      
      // Set default Kas Koperasi
      const kasKoperasi = activeAccounts.find(acc => acc.nama === 'Kas Koperasi');
      if (kasKoperasi) {
        setAkunKasId(kasKoperasi.id);
      } else if (activeAccounts.length > 0) {
        setAkunKasId(activeAccounts[0].id);
      }
    } catch (error) {
      console.error('Error loading akun kas:', error);
      toast.error('Gagal memuat akun kas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tanggal || !kategori || !jumlah || !akunKasId) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const jumlahNum = parseFloat(jumlah.replace(/\./g, '').replace(',', '.'));
    if (isNaN(jumlahNum) || jumlahNum <= 0) {
      toast.error('Jumlah harus berupa angka positif');
      return;
    }

    try {
      setLoading(true);

      // Create keuangan_koperasi entry
      await addKeuanganKoperasiTransaction({
        tanggal,
        jenis_transaksi: 'Pemasukan',
        kategori,
        sub_kategori: subKategori || undefined,
        jumlah: jumlahNum,
        deskripsi: deskripsi || kategori,
        penerima_pembayar: penerimaPembayar || undefined,
        akun_kas_id: akunKasId,
        status: 'posted'
      });

      // Update saldo akun kas
      try {
        await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
          p_akun_id: akunKasId
        });
      } catch (saldoError) {
        console.warn('Warning ensuring saldo correct:', saldoError);
      }

      // Reset form
      setTanggal(new Date().toISOString().split('T')[0]);
      setKategori('');
      setSubKategori('');
      setJumlah('');
      setDeskripsi('');
      setPenerimaPembayar('');

      toast.success('Pemasukan berhasil disimpan');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving pemasukan:', error);
      toast.error('Gagal menyimpan pemasukan: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-green-600" />
            Tambah Pemasukan Koperasi
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal *</Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kategori">Kategori *</Label>
              <Select value={kategori} onValueChange={setKategori} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_PEMASUKAN.map(kat => (
                    <SelectItem key={kat} value={kat}>{kat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub_kategori">Sub Kategori</Label>
              <Input
                id="sub_kategori"
                value={subKategori}
                onChange={(e) => setSubKategori(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                id="jumlah"
                type="text"
                value={jumlah}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setJumlah(value);
                }}
                placeholder="0"
                required
              />
              {jumlah && (
                <p className="text-sm text-gray-500">{formatCurrency(jumlah)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="akun_kas_id">Akun Kas *</Label>
              <Select value={akunKasId} onValueChange={setAkunKasId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas" />
                </SelectTrigger>
                <SelectContent>
                  {akunKasOptions.map(akun => (
                    <SelectItem key={akun.id} value={akun.id}>{akun.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="penerima_pembayar">Penerima</Label>
              <Input
                id="penerima_pembayar"
                value={penerimaPembayar}
                onChange={(e) => setPenerimaPembayar(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Deskripsi pemasukan..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormPemasukanKoperasi;




