import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createTransaction } from '@/services/inventaris.service';
import { toast } from 'sonner';
import { InventoryItem } from '@/types/inventaris.types';
import { Calendar } from 'lucide-react';

interface KeluarItemDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess?: () => void;
}

const TujuanOptions = [
  { value: 'Koperasi', label: 'Koperasi' },
  { value: 'Dapur', label: 'Dapur' },
  { value: 'Distribusi', label: 'Distribusi Bantuan' },
];

export default function KeluarItemDialog({ open, onClose, item, onSuccess }: KeluarItemDialogProps) {
  const [tujuan, setTujuan] = useState<string>('');
  const [jumlah, setJumlah] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!item) return;

    // Validasi
    if (!tujuan) {
      toast.error('Pilih tujuan pengeluaran');
      return;
    }

    const jumlahNum = parseInt(jumlah);
    if (!jumlahNum || jumlahNum <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    if (jumlahNum > (item.jumlah || 0)) {
      toast.error(`Stock tidak mencukupi. Stock tersedia: ${item.jumlah || 0}`);
      return;
    }

    try {
      setIsSubmitting(true);

      // Tentukan keluar_mode berdasarkan tujuan
      let keluarMode: string;
      let penerima: string;

      if (tujuan === 'Koperasi') {
        keluarMode = 'Koperasi';
        penerima = 'Koperasi';
      } else if (tujuan === 'Dapur') {
        keluarMode = 'Distribusi';
        penerima = 'Dapur';
      } else {
        keluarMode = 'Distribusi';
        penerima = 'Distribusi Bantuan';
      }

      await createTransaction({
        item_id: item.id,
        tipe: 'Keluar',
        keluar_mode: keluarMode,
        jumlah: jumlahNum,
        tanggal: tanggal,
        penerima: penerima,
        catatan: catatan || `Pengeluaran ke ${penerima}`,
        harga_satuan: null,
        harga_total: null,
        harga_dasar: null,
        sumbangan: null,
      });

      toast.success(`Item berhasil dikeluarkan ke ${penerima}`);
      
      // Reset form
      setTujuan('');
      setJumlah('');
      setCatatan('');
      setTanggal(new Date().toISOString().split('T')[0]);
      
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast.error(error.message || 'Gagal mencatat pengeluaran item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTujuan('');
      setJumlah('');
      setCatatan('');
      setTanggal(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  const stockTersedia = item?.jumlah || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pengeluaran Item</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Item Info */}
          {item && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-sm text-gray-900">{item.nama_barang}</div>
              <div className="text-xs text-gray-600 mt-1">
                Stock tersedia: <span className="font-medium">{stockTersedia} {item.satuan || 'unit'}</span>
              </div>
            </div>
          )}

          {/* Tujuan */}
          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Pengeluaran *</Label>
            <Select value={tujuan} onValueChange={setTujuan}>
              <SelectTrigger id="tujuan">
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                {TujuanOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah *</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={stockTersedia}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="Masukkan jumlah"
            />
            <p className="text-xs text-gray-500">
              Maksimal: {stockTersedia} {item?.satuan || 'unit'}
            </p>
          </div>

          {/* Tanggal */}
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tambahkan catatan jika diperlukan"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !tujuan || !jumlah}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




