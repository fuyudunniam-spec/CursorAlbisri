import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TransferDestinationDropdown } from './TransferDestinationDropdown';
import { TransferDestination, CreateTransferDTO } from '@/types/transfer.types';
import { InventoryItem } from '@/types/inventaris.types';
import { listInventory } from '@/services/inventaris.service';
import { createTransfer } from '@/services/inventaris-transfer.service';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Package, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface TransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * TransferFormDialog Component
 * 
 * Form dialog untuk membuat transfer inventaris dengan:
 * - Item selector dengan real-time stock display
 * - Quantity input dengan validation
 * - Destination dropdown
 * - Confirmation dialog sebelum submit
 * - Success/error notifications
 * 
 * Requirements: AC-1.3, AC-1.4, AC-6.2, AC-6.3, AC-6.4, AC-6.5, AC-6.6
 */
export function TransferFormDialog({
  open,
  onOpenChange,
  onSuccess
}: TransferFormDialogProps) {
  const { toast } = useToast();
  
  // Form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [jumlah, setJumlah] = useState<string>('');
  const [tujuan, setTujuan] = useState<TransferDestination | ''>('');
  const [catatan, setCatatan] = useState<string>('');
  
  // UI state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Load inventory items
  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  // Setup realtime subscription for stock updates
  useEffect(() => {
    if (!open || !selectedItemId) return;

    // Subscribe to inventaris stock changes for the selected item
    const channel = supabase
      .channel(`stock-updates-${selectedItemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventaris',
          filter: `id=eq.${selectedItemId}`
        },
        (payload) => {
          console.log('Stock update detected:', payload);
          
          const newRecord = payload.new as any;
          
          // Update the selected item with new stock
          if (newRecord && selectedItem) {
            const updatedItem = {
              ...selectedItem,
              jumlah: newRecord.jumlah
            };
            setSelectedItem(updatedItem);
            
            // Also update in items array
            setItems(prevItems => 
              prevItems.map(item => 
                item.id === selectedItemId 
                  ? { ...item, jumlah: newRecord.jumlah }
                  : item
              )
            );

            // Show notification if stock changed significantly
            if (newRecord.jumlah < (selectedItem.jumlah || 0)) {
              toast({
                title: 'Stok Berubah',
                description: `Stok ${selectedItem.nama_barang} berkurang menjadi ${newRecord.jumlah} ${selectedItem.satuan}`,
                variant: 'default'
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, selectedItemId, selectedItem, toast]);

  // Update selected item when item ID changes
  useEffect(() => {
    if (selectedItemId) {
      const item = items.find(i => i.id === selectedItemId);
      setSelectedItem(item || null);
      setValidationError(''); // Clear validation error when item changes
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId, items]);

  // Validate quantity when it changes
  useEffect(() => {
    if (jumlah && selectedItem) {
      const qty = parseInt(jumlah);
      if (isNaN(qty) || qty <= 0) {
        setValidationError('Jumlah harus lebih besar dari 0');
      } else if (qty > (selectedItem.jumlah || 0)) {
        setValidationError(
          `Stok tidak mencukupi. Tersedia: ${selectedItem.jumlah}, Diminta: ${qty}`
        );
      } else {
        setValidationError('');
      }
    }
  }, [jumlah, selectedItem]);

  const loadItems = async () => {
    setIsLoadingItems(true);
    try {
      const result = await listInventory({ page: 1, pageSize: 1000 }, {});
      setItems((result.data || []) as InventoryItem[]);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data inventaris',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  const resetForm = () => {
    setSelectedItemId('');
    setSelectedItem(null);
    setJumlah('');
    setTujuan('');
    setCatatan('');
    setValidationError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!selectedItemId || !jumlah || !tujuan) {
      setValidationError('Semua field harus diisi');
      return;
    }

    const qty = parseInt(jumlah);
    if (isNaN(qty) || qty <= 0) {
      setValidationError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (selectedItem && qty > (selectedItem.jumlah || 0)) {
      setValidationError(
        `Stok tidak mencukupi. Tersedia: ${selectedItem.jumlah}, Diminta: ${qty}`
      );
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);

    try {
      const transferData: CreateTransferDTO = {
        item_id: selectedItemId,
        jumlah: parseInt(jumlah),
        tujuan: tujuan as TransferDestination,
        catatan: catatan || undefined
      };

      await createTransfer(transferData);

      toast({
        title: 'Transfer Berhasil',
        description: `${selectedItem?.nama_barang} (${jumlah} ${selectedItem?.satuan}) berhasil ditransfer ke ${tujuan}`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast({
        title: 'Transfer Gagal',
        description: error.message || 'Terjadi kesalahan saat membuat transfer',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Inventaris</DialogTitle>
            <DialogDescription>
              Transfer barang dari inventaris yayasan ke tujuan lain
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Selector */}
            <div className="space-y-2">
              <Label htmlFor="item">Pilih Barang *</Label>
              <Select
                value={selectedItemId}
                onValueChange={setSelectedItemId}
                disabled={isLoadingItems || isSubmitting}
              >
                <SelectTrigger id="item">
                  <SelectValue placeholder="Pilih barang yang akan ditransfer">
                    {selectedItem && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{selectedItem.nama_barang}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isLoadingItems ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm">Memuat data...</span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Tidak ada barang tersedia
                    </div>
                  ) : (
                    items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.nama_barang}</span>
                          <span className="text-xs text-muted-foreground">
                            Stok: {item.jumlah} {item.satuan} | Kategori: {item.kategori}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Real-time Stock Display */}
            {selectedItem && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Stok Tersedia:</span>
                    <span className="text-lg font-bold">
                      {selectedItem.jumlah} {selectedItem.satuan}
                    </span>
                  </div>
                  {selectedItem.hpp && (
                    <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                      <span>HPP:</span>
                      <span>Rp {selectedItem.hpp.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah *</Label>
              <Input
                id="jumlah"
                type="number"
                min="1"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Masukkan jumlah yang akan ditransfer"
                disabled={!selectedItem || isSubmitting}
              />
            </div>

            {/* Destination Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="tujuan">Tujuan Transfer *</Label>
              <TransferDestinationDropdown
                value={tujuan}
                onChange={setTujuan}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                💡 Transfer ke Koperasi hanya bisa dilakukan dari modul Koperasi (tab "Item Yayasan")
              </p>
            </div>

            {/* Notes */}
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

            {/* Validation Error Display */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !!validationError || !selectedItemId || !jumlah || !tujuan}
              >
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mentransfer barang berikut?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-4">
            <div className="flex justify-between">
              <span className="font-medium">Barang:</span>
              <span>{selectedItem?.nama_barang}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Jumlah:</span>
              <span>{jumlah} {selectedItem?.satuan}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tujuan:</span>
              <span className="capitalize">{tujuan}</span>
            </div>
            {catatan && (
              <div className="flex flex-col gap-1">
                <span className="font-medium">Catatan:</span>
                <span className="text-sm text-muted-foreground">{catatan}</span>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Ya, Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
