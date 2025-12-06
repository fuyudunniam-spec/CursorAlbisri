import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, History, TruckIcon, RefreshCw, X } from 'lucide-react';
import { getTransfersByStatus, getTransferHistory, rejectTransfer } from '@/services/inventaris-transfer.service';
import type { TransferWithItem } from '@/types/transfer.types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TransferApprovalDialog from './components/TransferApprovalDialog';

export default function TransferPenerimaanPage() {
  const queryClient = useQueryClient();
  const [selectedTransferIds, setSelectedTransferIds] = useState<Set<string>>(new Set());
  const [postingBulk, setPostingBulk] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [transferToReject, setTransferToReject] = useState<TransferWithItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [transferToApprove, setTransferToApprove] = useState<TransferWithItem | null>(null);

  // Get pending transfers
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['pending-transfers'],
    queryFn: () => getTransfersByStatus('pending', 1, 100),
    refetchInterval: 30000,
  });

  // Get approved transfers for history
  const { data: approvedData } = useQuery({
    queryKey: ['approved-transfers'],
    queryFn: () => getTransferHistory({ 
      tujuan: 'koperasi',
      status: 'approved',
      page: 1,
      limit: 20
    }),
  });

  const pendingTransfers = pendingData?.data || [];
  const pendingCount = pendingData?.total || 0;
  const approvedTransfers = approvedData?.data || [];

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pending-transfers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_inventaris',
          filter: `status=eq.pending AND tujuan=eq.koperasi`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: localeId });
    } catch {
      return dateString;
    }
  };

  // Open approval dialog for single transfer
  const handleAutoPostTransfer = (transfer: TransferWithItem) => {
    setTransferToApprove(transfer);
    setApprovalDialogOpen(true);
  };

  // Bulk auto-post
  const handleBulkAutoPost = async () => {
    if (selectedTransferIds.size === 0) {
      toast.error("Pilih minimal 1 transfer untuk diproses");
      return;
    }

    try {
      setPostingBulk(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let successCount = 0;
      let errorCount = 0;

      for (const transferId of selectedTransferIds) {
        try {
          const { data, error } = await supabase
            .rpc('process_transfer_to_koperasi', {
              p_transfer_id: transferId,
              p_harga_jual: null,
              p_kondisi_barang: 'baik',
              p_user_id: userId
            });

          if (error) throw error;
          if (data.success) successCount++;
          else errorCount++;
        } catch (error) {
          console.error(`Error processing transfer ${transferId}:`, error);
          errorCount++;
        }
      }

      toast.success(`${successCount} transfer berhasil diproses!`);
      if (errorCount > 0) {
        toast.warning(`${errorCount} transfer gagal diproses`);
      }

      await refetchPending();
      queryClient.invalidateQueries({ queryKey: ['approved-transfers'] });
      setSelectedTransferIds(new Set());
    } catch (error) {
      console.error("Error bulk processing:", error);
      toast.error("Gagal memproses transfer");
    } finally {
      setPostingBulk(false);
    }
  };

  const handleToggleSelection = (transferId: string) => {
    const newSelection = new Set(selectedTransferIds);
    if (newSelection.has(transferId)) {
      newSelection.delete(transferId);
    } else {
      newSelection.add(transferId);
    }
    setSelectedTransferIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTransferIds.size === pendingTransfers.length) {
      setSelectedTransferIds(new Set());
    } else {
      setSelectedTransferIds(new Set(pendingTransfers.map(t => t.id)));
    }
  };

  // Handle reject transfer
  const handleRejectClick = (transfer: TransferWithItem) => {
    setTransferToReject(transfer);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!transferToReject) return;
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }

    try {
      setIsRejecting(true);
      await rejectTransfer(transferToReject.id, rejectionReason);
      
      toast.success('Transfer berhasil ditolak. Stok telah dikembalikan ke inventaris yayasan.');
      
      // Refresh data
      await refetchPending();
      queryClient.invalidateQueries({ queryKey: ['transfer-history'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-summary'] }); // Invalidate summary untuk update cards
      queryClient.invalidateQueries({ queryKey: ['inventaris'] });
      
      // Close dialog
      setRejectDialogOpen(false);
      setTransferToReject(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting transfer:', error);
      toast.error(error.message || 'Gagal menolak transfer');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Penerimaan Transfer dari Yayasan</h1>
        <p className="text-muted-foreground">
          Terima dan auto-post transfer inventaris ke koperasi
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <PackageCheck className="w-4 h-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          {pendingLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-pulse">Memuat data transfer...</div>
              </CardContent>
            </Card>
          ) : pendingTransfers.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Transfer Pending</CardTitle>
              </CardHeader>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TruckIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada transfer yang menunggu</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base font-semibold text-orange-900">
                      Transfer Belum Diproses
                    </CardTitle>
                    <Badge className="bg-orange-200 text-orange-800">{pendingCount}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchPending()}
                      className="text-xs h-7 border-gray-300"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkAutoPost}
                      disabled={postingBulk || selectedTransferIds.size === 0}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7"
                    >
                      {postingBulk ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          Auto-Post ({selectedTransferIds.size})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-orange-200 rounded-lg bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-50/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTransferIds.size === pendingTransfers.length && pendingTransfers.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Item</TableHead>
                        <TableHead className="font-semibold">Jumlah</TableHead>
                        <TableHead className="font-semibold text-right">HPP</TableHead>
                        <TableHead className="font-semibold">Tanggal</TableHead>
                        <TableHead className="font-semibold text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTransfers.map((transfer) => (
                        <TableRow key={transfer.id} className="hover:bg-orange-50/30">
                          <TableCell>
                            <Checkbox
                              checked={selectedTransferIds.has(transfer.id)}
                              onCheckedChange={() => handleToggleSelection(transfer.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{transfer.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {transfer.jumlah} {transfer.item_satuan || 'unit'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {transfer.hpp_yayasan 
                              ? formatCurrency(transfer.hpp_yayasan)
                              : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(transfer.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAutoPostTransfer(transfer)}
                                className="text-xs h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Proses
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectClick(transfer)}
                                className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer yang Sudah Diproses</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedTransfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada transfer yang diproses
                </p>
              ) : (
                <div className="space-y-3">
                  {approvedTransfers.map((transfer) => (
                    <div key={transfer.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{transfer.item_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.jumlah} {transfer.item_satuan || 'unit'}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {transfer.kondisi_barang === 'baik' ? 'Baik' : 'Rusak'}
                          </Badge>
                          {transfer.harga_jual_koperasi && (
                            <div className="text-sm font-medium mt-1">
                              {formatCurrency(transfer.harga_jual_koperasi)}
                            </div>
                          )}
                        </div>
                      </div>
                      {transfer.catatan && (
                        <div className="text-sm text-muted-foreground mt-2">
                          Catatan: {transfer.catatan}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <TransferApprovalDialog
        transfer={transferToApprove}
        open={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setTransferToApprove(null);
        }}
      />

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer yang ditolak akan mengembalikan stok ke inventaris yayasan.
              {transferToReject && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <div className="font-medium">{transferToReject.item_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {transferToReject.jumlah} {transferToReject.item_satuan || 'unit'}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Alasan Penolakan *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Masukkan alasan penolakan transfer..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setRejectDialogOpen(false);
                setTransferToReject(null);
                setRejectionReason('');
              }}
              disabled={isRejecting}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? 'Memproses...' : 'Ya, Tolak Transfer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
