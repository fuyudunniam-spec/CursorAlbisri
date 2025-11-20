import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTransactions } from "@/hooks/useInventoryTransactions";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TransactionBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export default function TransactionBulkActions({ 
  selectedIds, 
  onClearSelection, 
  onRefresh 
}: TransactionBulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteTransactions = useDeleteTransactions();

  const handleBulkDelete = async () => {
    try {
      await deleteTransactions.mutateAsync(selectedIds);
      toast.success(`Berhasil menghapus ${selectedIds.length} transaksi`);
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast.error("Gagal menghapus transaksi");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {selectedIds.length} dipilih
        </Badge>
        
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteTransactions.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Hapus ({selectedIds.length})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Batal Pilih
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Konfirmasi Hapus Transaksi
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} transaksi</strong>? 
              Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi stok inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteTransactions.isPending}
            >
              {deleteTransactions.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
