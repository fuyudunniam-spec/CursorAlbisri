import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetManagementService } from '@/services/asset-management.service';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '@/types/inventaris.types';

interface SimpleTransferDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  /**
   * Optional default tujuan (e.g. 'koperasi') when dialog is opened.
   */
  defaultTujuan?: string;
}

/**
 * Simple Transfer Dialog
 * 
 * Form sederhana untuk transfer inventaris:
 * - Item (pre-filled)
 * - Jumlah
 * - Tujuan (Koperasi, Distribusi, dll)
 * - Catatan (opsional)
 * 
 * Untuk koperasi: Langsung create kop_barang dengan HPP dan bagi hasil
 */
export default function SimpleTransferDialog({
  open,
  onClose,
  item,
  defaultTujuan,
}: SimpleTransferDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jumlah, setJumlah] = useState<string>('');
  const [tujuan, setTujuan] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && item) {
      setJumlah('');
      setTujuan(defaultTujuan || '');
      setCatatan('');
      setError('');
    }
  }, [open, item, defaultTujuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!item) {
      setError('Item tidak ditemukan');
      return;
    }

    if (!jumlah || !tujuan) {
      setError('Jumlah dan tujuan harus diisi');
      return;
    }

    const qty = parseInt(jumlah);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (qty > (item.jumlah || 0)) {
      setError(`Stok tidak mencukupi. Tersedia: ${item.jumlah || 0}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (tujuan === 'koperasi') {
        // Transfer ke koperasi menggunakan asset management service
        // Ini akan otomatis:
        // 1. Kurangi stock inventaris yayasan
        // 2. Create/update kop_barang dengan HPP dan bagi hasil
        // 3. Tambah stock koperasi
        // 4. Catat asset_transfer_log
        
        const hpp = item.harga_perolehan || 0;
        
        await assetManagementService.transferAsset({
          inventaris_id: item.id,
          quantity: qty,
          harga_transfer: hpp, // Gunakan HPP dari inventaris
          notes: catatan || `Transfer ke Koperasi: ${item.nama_barang}`,
        });

        // Invalidate semua query yang relevan untuk update otomatis di modul koperasi dan inventaris
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-active'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['asset-transfer-log'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke Koperasi. Stock koperasi telah ditambahkan.`,
        });
      } else {
        // Transfer ke tujuan lain (distribusi, dll)
        // Kurangi stock inventaris dan catat transaksi
        const newStock = (item.jumlah || 0) - qty;
        
        const { error: updateError } = await supabase
          .from('inventaris')
          .update({ jumlah: newStock })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Catat transaksi inventaris
        const { error: transError } = await supabase
          .from('transaksi_inventaris')
          .insert({
            item_id: item.id,
            tipe: 'Keluar',
            keluar_mode: `Transfer ke ${tujuan}`,
            jumlah: qty,
            harga_satuan: item.harga_perolehan || 0,
            tanggal: new Date().toISOString(),
            catatan: catatan || `Transfer ke ${tujuan}`,
            before_qty: item.jumlah,
            after_qty: newStock,
          });

        if (transError) throw transError;

        // Invalidate query inventaris untuk update otomatis
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke ${tujuan}.`,
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error transferring item:', error);
      setError(error.message || 'Gagal melakukan transfer');
      toast({
        title: 'Transfer Gagal',
        description: error.message || 'Terjadi kesalahan saat melakukan transfer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Inventaris</DialogTitle>
          <DialogDescription>
            Record jalur keluar inventaris yayasan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold">{item.nama_barang}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              Stok tersedia: <span className="font-medium">{item.jumlah || 0} {item.satuan}</span>
            </div>
            {item.harga_perolehan && (
              <div className="text-sm text-muted-foreground">
                HPP: <span className="font-medium">Rp {item.harga_perolehan.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah *</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={item.jumlah || 0}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="Masukkan jumlah"
              disabled={isSubmitting}
            />
          </div>

          {/* Tujuan */}
          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Transfer *</Label>
            <Select value={tujuan} onValueChange={setTujuan} disabled={isSubmitting}>
              <SelectTrigger id="tujuan">
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="koperasi">Koperasi (untuk dijual)</SelectItem>
                <SelectItem value="distribusi">Distribusi Bantuan</SelectItem>
                <SelectItem value="dapur">Dapur</SelectItem>
                <SelectItem value="asrama">Asrama</SelectItem>
                <SelectItem value="kantor">Kantor</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            {tujuan === 'koperasi' && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Transfer ke koperasi akan otomatis mencatat beban koperasi ke yayasan berdasarkan HPP
              </p>
            )}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !jumlah || !tujuan}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Transfer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}




  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetManagementService } from '@/services/asset-management.service';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '@/types/inventaris.types';

interface SimpleTransferDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  /**
   * Optional default tujuan (e.g. 'koperasi') when dialog is opened.
   */
  defaultTujuan?: string;
}

/**
 * Simple Transfer Dialog
 * 
 * Form sederhana untuk transfer inventaris:
 * - Item (pre-filled)
 * - Jumlah
 * - Tujuan (Koperasi, Distribusi, dll)
 * - Catatan (opsional)
 * 
 * Untuk koperasi: Langsung create kop_barang dengan HPP dan bagi hasil
 */
export default function SimpleTransferDialog({
  open,
  onClose,
  item,
  defaultTujuan,
}: SimpleTransferDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jumlah, setJumlah] = useState<string>('');
  const [tujuan, setTujuan] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && item) {
      setJumlah('');
      setTujuan(defaultTujuan || '');
      setCatatan('');
      setError('');
    }
  }, [open, item, defaultTujuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!item) {
      setError('Item tidak ditemukan');
      return;
    }

    if (!jumlah || !tujuan) {
      setError('Jumlah dan tujuan harus diisi');
      return;
    }

    const qty = parseInt(jumlah);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (qty > (item.jumlah || 0)) {
      setError(`Stok tidak mencukupi. Tersedia: ${item.jumlah || 0}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (tujuan === 'koperasi') {
        // Transfer ke koperasi menggunakan asset management service
        // Ini akan otomatis:
        // 1. Kurangi stock inventaris yayasan
        // 2. Create/update kop_barang dengan HPP dan bagi hasil
        // 3. Tambah stock koperasi
        // 4. Catat asset_transfer_log
        
        const hpp = item.harga_perolehan || 0;
        
        await assetManagementService.transferAsset({
          inventaris_id: item.id,
          quantity: qty,
          harga_transfer: hpp, // Gunakan HPP dari inventaris
          notes: catatan || `Transfer ke Koperasi: ${item.nama_barang}`,
        });

        // Invalidate semua query yang relevan untuk update otomatis di modul koperasi dan inventaris
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-active'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['asset-transfer-log'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke Koperasi. Stock koperasi telah ditambahkan.`,
        });
      } else {
        // Transfer ke tujuan lain (distribusi, dll)
        // Kurangi stock inventaris dan catat transaksi
        const newStock = (item.jumlah || 0) - qty;
        
        const { error: updateError } = await supabase
          .from('inventaris')
          .update({ jumlah: newStock })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Catat transaksi inventaris
        const { error: transError } = await supabase
          .from('transaksi_inventaris')
          .insert({
            item_id: item.id,
            tipe: 'Keluar',
            keluar_mode: `Transfer ke ${tujuan}`,
            jumlah: qty,
            harga_satuan: item.harga_perolehan || 0,
            tanggal: new Date().toISOString(),
            catatan: catatan || `Transfer ke ${tujuan}`,
            before_qty: item.jumlah,
            after_qty: newStock,
          });

        if (transError) throw transError;

        // Invalidate query inventaris untuk update otomatis
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke ${tujuan}.`,
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error transferring item:', error);
      setError(error.message || 'Gagal melakukan transfer');
      toast({
        title: 'Transfer Gagal',
        description: error.message || 'Terjadi kesalahan saat melakukan transfer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Inventaris</DialogTitle>
          <DialogDescription>
            Record jalur keluar inventaris yayasan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold">{item.nama_barang}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              Stok tersedia: <span className="font-medium">{item.jumlah || 0} {item.satuan}</span>
            </div>
            {item.harga_perolehan && (
              <div className="text-sm text-muted-foreground">
                HPP: <span className="font-medium">Rp {item.harga_perolehan.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah *</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={item.jumlah || 0}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="Masukkan jumlah"
              disabled={isSubmitting}
            />
          </div>

          {/* Tujuan */}
          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Transfer *</Label>
            <Select value={tujuan} onValueChange={setTujuan} disabled={isSubmitting}>
              <SelectTrigger id="tujuan">
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="koperasi">Koperasi (untuk dijual)</SelectItem>
                <SelectItem value="distribusi">Distribusi Bantuan</SelectItem>
                <SelectItem value="dapur">Dapur</SelectItem>
                <SelectItem value="asrama">Asrama</SelectItem>
                <SelectItem value="kantor">Kantor</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            {tujuan === 'koperasi' && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Transfer ke koperasi akan otomatis mencatat beban koperasi ke yayasan berdasarkan HPP
              </p>
            )}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !jumlah || !tujuan}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Transfer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetManagementService } from '@/services/asset-management.service';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '@/types/inventaris.types';

interface SimpleTransferDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  /**
   * Optional default tujuan (e.g. 'koperasi') when dialog is opened.
   */
  defaultTujuan?: string;
}

/**
 * Simple Transfer Dialog
 * 
 * Form sederhana untuk transfer inventaris:
 * - Item (pre-filled)
 * - Jumlah
 * - Tujuan (Koperasi, Distribusi, dll)
 * - Catatan (opsional)
 * 
 * Untuk koperasi: Langsung create kop_barang dengan HPP dan bagi hasil
 */
export default function SimpleTransferDialog({
  open,
  onClose,
  item,
  defaultTujuan,
}: SimpleTransferDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jumlah, setJumlah] = useState<string>('');
  const [tujuan, setTujuan] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && item) {
      setJumlah('');
      setTujuan(defaultTujuan || '');
      setCatatan('');
      setError('');
    }
  }, [open, item, defaultTujuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!item) {
      setError('Item tidak ditemukan');
      return;
    }

    if (!jumlah || !tujuan) {
      setError('Jumlah dan tujuan harus diisi');
      return;
    }

    const qty = parseInt(jumlah);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (qty > (item.jumlah || 0)) {
      setError(`Stok tidak mencukupi. Tersedia: ${item.jumlah || 0}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (tujuan === 'koperasi') {
        // Transfer ke koperasi menggunakan asset management service
        // Ini akan otomatis:
        // 1. Kurangi stock inventaris yayasan
        // 2. Create/update kop_barang dengan HPP dan bagi hasil
        // 3. Tambah stock koperasi
        // 4. Catat asset_transfer_log
        
        const hpp = item.harga_perolehan || 0;
        
        await assetManagementService.transferAsset({
          inventaris_id: item.id,
          quantity: qty,
          harga_transfer: hpp, // Gunakan HPP dari inventaris
          notes: catatan || `Transfer ke Koperasi: ${item.nama_barang}`,
        });

        // Invalidate semua query yang relevan untuk update otomatis di modul koperasi dan inventaris
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-active'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['asset-transfer-log'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke Koperasi. Stock koperasi telah ditambahkan.`,
        });
      } else {
        // Transfer ke tujuan lain (distribusi, dll)
        // Kurangi stock inventaris dan catat transaksi
        const newStock = (item.jumlah || 0) - qty;
        
        const { error: updateError } = await supabase
          .from('inventaris')
          .update({ jumlah: newStock })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Catat transaksi inventaris
        const { error: transError } = await supabase
          .from('transaksi_inventaris')
          .insert({
            item_id: item.id,
            tipe: 'Keluar',
            keluar_mode: `Transfer ke ${tujuan}`,
            jumlah: qty,
            harga_satuan: item.harga_perolehan || 0,
            tanggal: new Date().toISOString(),
            catatan: catatan || `Transfer ke ${tujuan}`,
            before_qty: item.jumlah,
            after_qty: newStock,
          });

        if (transError) throw transError;

        // Invalidate query inventaris untuk update otomatis
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke ${tujuan}.`,
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error transferring item:', error);
      setError(error.message || 'Gagal melakukan transfer');
      toast({
        title: 'Transfer Gagal',
        description: error.message || 'Terjadi kesalahan saat melakukan transfer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Inventaris</DialogTitle>
          <DialogDescription>
            Record jalur keluar inventaris yayasan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold">{item.nama_barang}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              Stok tersedia: <span className="font-medium">{item.jumlah || 0} {item.satuan}</span>
            </div>
            {item.harga_perolehan && (
              <div className="text-sm text-muted-foreground">
                HPP: <span className="font-medium">Rp {item.harga_perolehan.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah *</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={item.jumlah || 0}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="Masukkan jumlah"
              disabled={isSubmitting}
            />
          </div>

          {/* Tujuan */}
          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Transfer *</Label>
            <Select value={tujuan} onValueChange={setTujuan} disabled={isSubmitting}>
              <SelectTrigger id="tujuan">
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="koperasi">Koperasi (untuk dijual)</SelectItem>
                <SelectItem value="distribusi">Distribusi Bantuan</SelectItem>
                <SelectItem value="dapur">Dapur</SelectItem>
                <SelectItem value="asrama">Asrama</SelectItem>
                <SelectItem value="kantor">Kantor</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            {tujuan === 'koperasi' && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Transfer ke koperasi akan otomatis mencatat beban koperasi ke yayasan berdasarkan HPP
              </p>
            )}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !jumlah || !tujuan}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Transfer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}




  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetManagementService } from '@/services/asset-management.service';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '@/types/inventaris.types';

interface SimpleTransferDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  /**
   * Optional default tujuan (e.g. 'koperasi') when dialog is opened.
   */
  defaultTujuan?: string;
}

/**
 * Simple Transfer Dialog
 * 
 * Form sederhana untuk transfer inventaris:
 * - Item (pre-filled)
 * - Jumlah
 * - Tujuan (Koperasi, Distribusi, dll)
 * - Catatan (opsional)
 * 
 * Untuk koperasi: Langsung create kop_barang dengan HPP dan bagi hasil
 */
export default function SimpleTransferDialog({
  open,
  onClose,
  item,
  defaultTujuan,
}: SimpleTransferDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jumlah, setJumlah] = useState<string>('');
  const [tujuan, setTujuan] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && item) {
      setJumlah('');
      setTujuan(defaultTujuan || '');
      setCatatan('');
      setError('');
    }
  }, [open, item, defaultTujuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!item) {
      setError('Item tidak ditemukan');
      return;
    }

    if (!jumlah || !tujuan) {
      setError('Jumlah dan tujuan harus diisi');
      return;
    }

    const qty = parseInt(jumlah);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (qty > (item.jumlah || 0)) {
      setError(`Stok tidak mencukupi. Tersedia: ${item.jumlah || 0}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (tujuan === 'koperasi') {
        // Transfer ke koperasi menggunakan asset management service
        // Ini akan otomatis:
        // 1. Kurangi stock inventaris yayasan
        // 2. Create/update kop_barang dengan HPP dan bagi hasil
        // 3. Tambah stock koperasi
        // 4. Catat asset_transfer_log
        
        const hpp = item.harga_perolehan || 0;
        
        await assetManagementService.transferAsset({
          inventaris_id: item.id,
          quantity: qty,
          harga_transfer: hpp, // Gunakan HPP dari inventaris
          notes: catatan || `Transfer ke Koperasi: ${item.nama_barang}`,
        });

        // Invalidate semua query yang relevan untuk update otomatis di modul koperasi dan inventaris
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-with-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-yayasan-items'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-produk-active'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
        queryClient.invalidateQueries({ queryKey: ['koperasi-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['asset-transfer-log'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke Koperasi. Stock koperasi telah ditambahkan.`,
        });
      } else {
        // Transfer ke tujuan lain (distribusi, dll)
        // Kurangi stock inventaris dan catat transaksi
        const newStock = (item.jumlah || 0) - qty;
        
        const { error: updateError } = await supabase
          .from('inventaris')
          .update({ jumlah: newStock })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Catat transaksi inventaris
        const { error: transError } = await supabase
          .from('transaksi_inventaris')
          .insert({
            item_id: item.id,
            tipe: 'Keluar',
            keluar_mode: `Transfer ke ${tujuan}`,
            jumlah: qty,
            harga_satuan: item.harga_perolehan || 0,
            tanggal: new Date().toISOString(),
            catatan: catatan || `Transfer ke ${tujuan}`,
            before_qty: item.jumlah,
            after_qty: newStock,
          });

        if (transError) throw transError;

        // Invalidate query inventaris untuk update otomatis
        queryClient.invalidateQueries({ queryKey: ['inventaris'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventaris-transactions'] });

        toast({
          title: 'Transfer Berhasil',
          description: `${item.nama_barang} (${qty} ${item.satuan}) berhasil ditransfer ke ${tujuan}.`,
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Error transferring item:', error);
      setError(error.message || 'Gagal melakukan transfer');
      toast({
        title: 'Transfer Gagal',
        description: error.message || 'Terjadi kesalahan saat melakukan transfer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Inventaris</DialogTitle>
          <DialogDescription>
            Record jalur keluar inventaris yayasan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold">{item.nama_barang}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              Stok tersedia: <span className="font-medium">{item.jumlah || 0} {item.satuan}</span>
            </div>
            {item.harga_perolehan && (
              <div className="text-sm text-muted-foreground">
                HPP: <span className="font-medium">Rp {item.harga_perolehan.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah *</Label>
            <Input
              id="jumlah"
              type="number"
              min="1"
              max={item.jumlah || 0}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              placeholder="Masukkan jumlah"
              disabled={isSubmitting}
            />
          </div>

          {/* Tujuan */}
          <div className="space-y-2">
            <Label htmlFor="tujuan">Tujuan Transfer *</Label>
            <Select value={tujuan} onValueChange={setTujuan} disabled={isSubmitting}>
              <SelectTrigger id="tujuan">
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="koperasi">Koperasi (untuk dijual)</SelectItem>
                <SelectItem value="distribusi">Distribusi Bantuan</SelectItem>
                <SelectItem value="dapur">Dapur</SelectItem>
                <SelectItem value="asrama">Asrama</SelectItem>
                <SelectItem value="kantor">Kantor</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            {tujuan === 'koperasi' && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Transfer ke koperasi akan otomatis mencatat beban koperasi ke yayasan berdasarkan HPP
              </p>
            )}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !jumlah || !tujuan}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Transfer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

