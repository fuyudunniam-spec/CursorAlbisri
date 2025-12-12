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
import { KATEGORI_PEMASUKAN } from '../../constants';
import { formatCurrencyFromString, parseCurrencyString } from '@/utils/formatCurrency';

interface FormPemasukanKoperasiProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

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
      // Filter hanya akun kas koperasi: managed_by = 'koperasi' atau nama mengandung 'koperasi'
      const koperasiAccounts = accounts.filter(acc => 
        acc.status === 'aktif' && 
        (acc.managed_by === 'koperasi' || acc.nama?.toLowerCase().includes('koperasi'))
      );
      setAkunKasOptions(koperasiAccounts);
      
      // Set default Kas Koperasi
      const kasKoperasi = koperasiAccounts.find(acc => acc.nama === 'Kas Koperasi');
      if (kasKoperasi) {
        setAkunKasId(kasKoperasi.id);
      } else if (koperasiAccounts.length > 0) {
        setAkunKasId(koperasiAccounts[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat akun kas';
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tanggal || !kategori || !jumlah || !akunKasId) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    const jumlahNum = parseCurrencyString(jumlah);
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
        // Silent fail - saldo will be recalculated on next transaction
        // Log only in development
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Warning ensuring saldo correct:', saldoError);
        }
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan pemasukan';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
                <p className="text-sm text-gray-500">{formatCurrencyFromString(jumlah)}</p>
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
              <Label htmlFor="penerima_pembayar">Sumber</Label>
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




