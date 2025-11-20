import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { deleteInventoryItem } from '@/services/inventaris.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteConfirmDialogProps {
  item: any;
  onClose: () => void;
}

const DeleteConfirmDialog = ({ item, onClose }: DeleteConfirmDialogProps) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInventoryItem(item.id);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-master'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['near-expiry'] });
      
      toast.success('Item berhasil dihapus');
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Gagal menghapus item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Konfirmasi Hapus
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus item ini?
            </p>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium">{item.nama_barang}</h4>
              <p className="text-sm text-muted-foreground">
                {item.kategori} • {item.tipe_item}
              </p>
              <p className="text-sm text-muted-foreground">
                Stok: {item.jumlah || 0} {item.satuan || ''}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. 
                Semua data terkait item ini akan dihapus secara permanen.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteConfirmDialog;
