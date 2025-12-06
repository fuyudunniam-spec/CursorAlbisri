import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus, Search, Package, Loader2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { assetManagementService } from '@/services/asset-management.service';

interface TransferItem {
  inventaris_id: string;
  nama_item: string;
  satuan: string;
  stock_tersedia: number;
  jumlah_transfer: number;
  harga_transfer: number;
  subtotal: number;
}

export default function TransferFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<TransferItem[]>([]);
  const [keterangan, setKeterangan] = useState('');
  const [userId, setUserId] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Fetch inventaris items
  const { data: inventarisList = [], isLoading: loadingInventaris } = useQuery({
    queryKey: ['inventaris-for-transfer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventaris')
        .select('id, nama_barang, kategori, satuan, jumlah, harga_perolehan, hpp')
        .gt('jumlah', 0)
        .order('nama_barang');

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const addItem = () => {
    setItems([...items, {
      inventaris_id: '',
      nama_item: '',
      satuan: '',
      stock_tersedia: 0,
      jumlah_transfer: 0,
      harga_transfer: 0,
      subtotal: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransferItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'inventaris_id') {
      const selected = inventarisList.find(inv => inv.id === value);
      if (selected) {
        newItems[index].nama_item = selected.nama_barang;
        newItems[index].satuan = selected.satuan;
        newItems[index].stock_tersedia = selected.jumlah;
        // Set default harga transfer dari HPP atau harga perolehan
        if (newItems[index].harga_transfer === 0) {
          if (selected.hpp) {
            newItems[index].harga_transfer = selected.hpp;
          } else if (selected.harga_perolehan) {
            newItems[index].harga_transfer = selected.harga_perolehan;
          }
        }
      }
    }

    if (field === 'jumlah_transfer' || field === 'harga_transfer') {
      newItems[index].subtotal = newItems[index].jumlah_transfer * newItems[index].harga_transfer;
    }

    setItems(newItems);
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('Belum ada item yang ditransfer');

      for (const item of items) {
        if (!item.inventaris_id) throw new Error('Pilih item inventaris');
        if (item.jumlah_transfer <= 0) throw new Error('Jumlah transfer harus > 0');
        if (item.jumlah_transfer > item.stock_tersedia) throw new Error(`Stock ${item.nama_item} tidak cukup`);
        if (item.harga_transfer <= 0) throw new Error('Harga transfer harus > 0');
      }

      // Process each item using asset management service
      for (const item of items) {
        await assetManagementService.transferAsset({
          inventaris_id: item.inventaris_id,
          quantity: item.jumlah_transfer,
          harga_transfer: item.harga_transfer,
          notes: keterangan || `Transfer ke koperasi: ${item.nama_item}`,
        });
      }
    },
    onSuccess: () => {
      toast.success('Transfer berhasil');
      queryClient.invalidateQueries({ queryKey: ['transfer-history'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-stats'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris-for-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['inventaris'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal transfer');
    },
  });

  const handleClose = () => {
    setItems([]);
    setKeterangan('');
    onClose();
  };

  const totalNilai = items.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Inventaris ke Koperasi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Item #{index + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Item Inventaris *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {item.inventaris_id ? (
                            <span className="truncate">
                              {inventarisList.find(inv => inv.id === item.inventaris_id)?.nama_barang || 'Pilih item'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Cari item inventaris...</span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Cari nama barang..." />
                          <CommandEmpty>
                            {loadingInventaris ? 'Memuat...' : 'Tidak ada item ditemukan'}
                          </CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {inventarisList.map((inv) => (
                              <CommandItem
                                key={inv.id}
                                value={`${inv.nama_barang} ${inv.kategori}`}
                                onSelect={() => {
                                  updateItem(index, 'inventaris_id', inv.id);
                                }}
                              >
                                <div className="flex flex-col w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{inv.nama_barang}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {inv.jumlah} {inv.satuan}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {inv.kategori} • Rp {(inv.harga_perolehan || 0).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {item.inventaris_id && item.stock_tersedia > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Stock tersedia: {item.stock_tersedia} {item.satuan}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Jumlah Transfer</Label>
                    <Input
                      type="number"
                      value={item.jumlah_transfer || ''}
                      onChange={(e) => updateItem(index, 'jumlah_transfer', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      max={item.stock_tersedia}
                    />
                    {item.stock_tersedia > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tersedia: {item.stock_tersedia} {item.satuan}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Harga Transfer</Label>
                    <Input
                      type="number"
                      value={item.harga_transfer || ''}
                      onChange={(e) => updateItem(index, 'harga_transfer', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label>Subtotal</Label>
                    <Input
                      value={`Rp ${item.subtotal.toLocaleString('id-ID')}`}
                      disabled
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button onClick={addItem} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </div>

          {/* Keterangan */}
          <div>
            <Label>Keterangan</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan transfer (opsional)"
              rows={3}
            />
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Nilai Transfer:</span>
                <span>Rp {totalNilai.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button
              onClick={() => transferMutation.mutate()}
              disabled={items.length === 0 || transferMutation.isPending}
            >
              {transferMutation.isPending ? 'Memproses...' : 'Transfer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
