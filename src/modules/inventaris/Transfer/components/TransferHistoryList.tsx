import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { TransferDestination, TransferStatus, TransferFilters, TransferWithItem } from '@/types/transfer.types';
import { supabase } from '@/integrations/supabase/client';
import { getTransferHistory } from '@/services/inventaris-transfer.service';
import { exportTransferToExcel, exportTransferToPDF } from '@/utils/export/transferExporter';
import { useToast } from '@/hooks/use-toast';
import { listInventory } from '@/services/inventaris.service';
import { updateTransfer, deleteTransfer } from '@/services/inventaris-transfer.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  Filter, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Package,
  MapPin,
  User,
  FileSpreadsheet,
  FileText,
  Search,
  Store,
  Home,
  Utensils,
  Building2,
  HelpCircle,
  ArrowRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { InventoryItem } from '@/types/inventaris.types';

interface TransferHistoryListProps {
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<TransferStatus, string> = {
  [TransferStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [TransferStatus.APPROVED]: 'bg-green-100 text-green-800 border-green-300',
  [TransferStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-300',
  [TransferStatus.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-300',
};

const STATUS_LABELS: Record<TransferStatus, string> = {
  [TransferStatus.PENDING]: 'Pending',
  [TransferStatus.APPROVED]: 'Disetujui',
  [TransferStatus.REJECTED]: 'Ditolak',
  [TransferStatus.COMPLETED]: 'Selesai',
};

const DESTINATION_ICONS: Record<TransferDestination, any> = {
  [TransferDestination.KOPERASI]: Store,
  [TransferDestination.DISTRIBUSI]: Package,
  [TransferDestination.DAPUR]: Utensils,
  [TransferDestination.ASRAMA]: Home,
  [TransferDestination.KANTOR]: Building2,
  [TransferDestination.LAINNYA]: HelpCircle,
};

const DESTINATION_LABELS: Record<TransferDestination, string> = {
  [TransferDestination.KOPERASI]: 'Koperasi',
  [TransferDestination.DISTRIBUSI]: 'Distribusi Bantuan',
  [TransferDestination.DAPUR]: 'Dapur',
  [TransferDestination.ASRAMA]: 'Asrama',
  [TransferDestination.KANTOR]: 'Kantor',
  [TransferDestination.LAINNYA]: 'Lainnya',
};

/**
 * TransferHistoryList Component
 * 
 * Menampilkan riwayat transfer dengan:
 * - Table dengan columns: item, jumlah, tujuan, status, tanggal, user
 * - Filters untuk tujuan, status, date range
 * - Pagination
 * - Export button
 * 
 * Requirements: AC-4.1, AC-4.2, AC-4.4
 */
export function TransferHistoryList({ onRefresh }: TransferHistoryListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Data state
  const [transfers, setTransfers] = useState<TransferWithItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<TransferFilters>({
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Temporary filter state (before applying)
  const [tempTujuan, setTempTujuan] = useState<TransferDestination | ''>('');
  const [tempStatus, setTempStatus] = useState<TransferStatus | ''>('');
  const [tempDateFrom, setTempDateFrom] = useState<string>('');
  const [tempDateTo, setTempDateTo] = useState<string>('');
  const [tempItemId, setTempItemId] = useState<string>('');
  
  // Item list for filter
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  // Edit/Delete state
  const [editingTransfer, setEditingTransfer] = useState<TransferWithItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editJumlah, setEditJumlah] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTransfersCallback = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Loading transfers with filters:', filters);
      
      // Use getTransferHistory function which handles transfer_inventaris table
      const result = await getTransferHistory(filters);
      
      console.log('Transfer result:', result);
      console.log('Transfer data:', result.data);
      console.log('Total items:', result.total);
      
      setTransfers(result.data as TransferWithItem[]);
      setTotalItems(result.total);
    } catch (error: any) {
      console.error('Error loading transfers:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle case when table doesn't exist yet
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        setTransfers([]);
        setTotalItems(0);
        toast({
          title: "Info",
          description: "Tabel transfer belum tersedia. Silakan refresh halaman setelah migration selesai.",
          variant: "default"
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Gagal memuat riwayat transfer",
        variant: "destructive"
      });
      setTransfers([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    loadTransfersCallback();
  }, [loadTransfersCallback]);

  // Setup realtime subscription for transfer_inventaris changes
  useEffect(() => {
    const channel = supabase
      .channel('transfer-inventaris-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_inventaris'
        },
        () => {
          console.log('Transfer data changed, refreshing...');
          loadTransfersCallback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTransfersCallback]);

  useEffect(() => {
    if (showFilters && items.length === 0) {
      loadItems();
    }
  }, [showFilters]);


  const loadItems = async () => {
    setIsLoadingItems(true);
    try {
      const result = await listInventory({ page: 1, pageSize: 1000 }, {});
      setItems((result.data || []) as InventoryItem[]);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleApplyFilters = () => {
    setFilters({
      ...filters,
      page: 1, // Reset to first page
      tujuan: tempTujuan || undefined,
      status: tempStatus || undefined,
      date_from: tempDateFrom || undefined,
      date_to: tempDateTo || undefined,
      // Ignore special values like "loading" or "no-items"
      item_id: (tempItemId && tempItemId !== 'loading' && tempItemId !== 'no-items') ? tempItemId : undefined
    });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempTujuan('');
    setTempStatus('');
    setTempDateFrom('');
    setTempDateTo('');
    setTempItemId('');
    setFilters({
      page: 1,
      limit: filters.limit
    });
  };

  const handleExportExcel = async () => {
    try {
      if (transfers.length === 0) {
        toast({
          title: 'Tidak ada data',
          description: 'Tidak ada data transfer untuk diekspor',
          variant: 'destructive'
        });
        return;
      }

      exportTransferToExcel(transfers, filters);
      
      toast({
        title: 'Export berhasil',
        description: 'Data transfer berhasil diekspor ke Excel',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export gagal',
        description: 'Gagal mengekspor data ke Excel',
        variant: 'destructive'
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      if (transfers.length === 0) {
        toast({
          title: 'Tidak ada data',
          description: 'Tidak ada data transfer untuk diekspor',
          variant: 'destructive'
        });
        return;
      }

      await exportTransferToPDF(transfers, filters);
      
      toast({
        title: 'Export berhasil',
        description: 'Data transfer berhasil diekspor ke PDF',
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: 'Export gagal',
        description: 'Gagal mengekspor data ke PDF',
        variant: 'destructive'
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  // Handle Edit
  const handleEditClick = (transfer: TransferWithItem) => {
    if (transfer.status !== 'pending') {
      toast({
        title: 'Tidak dapat mengedit',
        description: 'Hanya transfer dengan status pending yang dapat diedit',
        variant: 'destructive'
      });
      return;
    }
    setEditingTransfer(transfer);
    setEditJumlah(transfer.jumlah);
    setEditCatatan(transfer.catatan || '');
    setEditDialogOpen(true);
  };

  const handleUpdateTransfer = async () => {
    if (!editingTransfer) return;

    try {
      setIsUpdating(true);
      await updateTransfer(editingTransfer.id, {
        jumlah: editJumlah,
        catatan: editCatatan
      });

      toast({
        title: 'Berhasil',
        description: 'Transfer berhasil diupdate'
      });

      setEditDialogOpen(false);
      setEditingTransfer(null);
      loadTransfersCallback();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupdate transfer',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete
  const handleDeleteClick = async (transfer: TransferWithItem) => {
    if (transfer.status !== 'pending') {
      toast({
        title: 'Tidak dapat menghapus',
        description: 'Hanya transfer dengan status pending yang dapat dihapus',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`Hapus transfer "${transfer.item_name}"? Stok akan dikembalikan ke inventaris.`)) {
      return;
    }

    try {
      setDeletingId(transfer.id);
      await deleteTransfer(transfer.id);

      toast({
        title: 'Berhasil',
        description: 'Transfer berhasil dihapus'
      });

      loadTransfersCallback();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus transfer',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalItems / (filters.limit || 20));
  const hasActiveFilters = filters.tujuan || filters.status || filters.date_from || filters.date_to || filters.item_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Riwayat Transfer - Tracking Tujuan Inventaris
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.values(filters).filter(v => v && v !== 1 && v !== 10).length}
                </Badge>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export ke Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export ke PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Item Filter - NEW */}
              <div className="space-y-2">
                <Label>Barang (Tracking)</Label>
                <Select 
                  value={tempItemId || undefined} 
                  onValueChange={(value) => setTempItemId(value || '')}
                  disabled={isLoadingItems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingItems ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : items.length === 0 ? (
                      <SelectItem value="no-items" disabled>Tidak ada barang</SelectItem>
                    ) : (
                      items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.nama_barang}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.kategori}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tujuan Filter */}
              <div className="space-y-2">
                <Label>Tujuan</Label>
                <Select 
                  value={tempTujuan || undefined} 
                  onValueChange={(val) => setTempTujuan(val ? (val as TransferDestination) : '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransferDestination.KOPERASI}>Koperasi</SelectItem>
                    <SelectItem value={TransferDestination.DISTRIBUSI}>Distribusi Bantuan</SelectItem>
                    <SelectItem value={TransferDestination.DAPUR}>Dapur</SelectItem>
                    <SelectItem value={TransferDestination.ASRAMA}>Asrama</SelectItem>
                    <SelectItem value={TransferDestination.KANTOR}>Kantor</SelectItem>
                    <SelectItem value={TransferDestination.LAINNYA}>Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={tempStatus || undefined} 
                  onValueChange={(val) => setTempStatus(val ? (val as TransferStatus) : '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransferStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={TransferStatus.APPROVED}>Disetujui</SelectItem>
                    <SelectItem value={TransferStatus.REJECTED}>Ditolak</SelectItem>
                    <SelectItem value={TransferStatus.COMPLETED}>Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <Label>Dari Tanggal</Label>
                <Input
                  type="date"
                  value={tempDateFrom}
                  onChange={(e) => setTempDateFrom(e.target.value)}
                />
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <Label>Sampai Tanggal</Label>
                <Input
                  type="date"
                  value={tempDateTo}
                  onChange={(e) => setTempDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Reset
              </Button>
              <Button size="sm" onClick={handleApplyFilters}>
                Terapkan Filter
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada riwayat transfer</p>
            {hasActiveFilters && (
              <Button
                variant="link"
                size="sm"
                onClick={handleClearFilters}
                className="mt-2"
              >
                Hapus filter
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Item
                      </div>
                    </TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Tujuan
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Tanggal
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        User
                      </div>
                    </TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold">{transfer.item_name}</span>
                          {transfer.item_kategori && (
                            <span className="text-xs text-muted-foreground">
                              {transfer.item_kategori}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{transfer.jumlah}</span>
                          <span className="text-sm text-muted-foreground">
                            {transfer.item_satuan || 'unit'}
                          </span>
                        </div>
                        {transfer.hpp_yayasan && (
                          <div className="text-xs text-muted-foreground mt-1">
                            HPP: Rp {transfer.hpp_yayasan.toLocaleString('id-ID')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = DESTINATION_ICONS[transfer.tujuan] || HelpCircle;
                            return <Icon className="h-4 w-4 text-gray-500" />;
                          })()}
                          <span className="font-medium">
                            {DESTINATION_LABELS[transfer.tujuan] || transfer.tujuan}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[transfer.status]}
                        >
                          {STATUS_LABELS[transfer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(transfer.created_at), 'dd MMM yyyy', {
                              locale: localeId
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(transfer.created_at), 'HH:mm', {
                              locale: localeId
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transfer.created_by_name || transfer.created_by?.substring(0, 8) || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transfer.catatan ? (
                          <span className="text-xs text-muted-foreground" title={transfer.catatan}>
                            {transfer.catatan.length > 30 
                              ? transfer.catatan.substring(0, 30) + '...'
                              : transfer.catatan}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          {transfer.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(transfer)}
                                disabled={isUpdating}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(transfer)}
                                disabled={deletingId === transfer.id}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {transfer.status !== 'pending' && (
                            <span className="text-xs text-muted-foreground italic">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Transfer</DialogTitle>
                </DialogHeader>
                {editingTransfer && (
                  <div className="space-y-4 py-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="font-medium">{editingTransfer.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {editingTransfer.item_kategori}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="edit-jumlah">Jumlah *</Label>
                      <Input
                        id="edit-jumlah"
                        type="number"
                        min="1"
                        value={editJumlah}
                        onChange={(e) => setEditJumlah(parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Satuan: {editingTransfer.item_satuan || 'unit'}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="edit-catatan">Catatan</Label>
                      <Textarea
                        id="edit-catatan"
                        value={editCatatan}
                        onChange={(e) => setEditCatatan(e.target.value)}
                        rows={3}
                        placeholder="Tambahkan catatan (opsional)"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setEditingTransfer(null);
                    }}
                    disabled={isUpdating}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUpdateTransfer}
                    disabled={isUpdating || editJumlah <= 0}
                  >
                    {isUpdating ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Menampilkan {((filters.page || 1) - 1) * (filters.limit || 20) + 1} -{' '}
                  {Math.min((filters.page || 1) * (filters.limit || 20), totalItems)} dari{' '}
                  {totalItems} transfer
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                    disabled={filters.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      Halaman {filters.page} dari {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                    disabled={filters.page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
