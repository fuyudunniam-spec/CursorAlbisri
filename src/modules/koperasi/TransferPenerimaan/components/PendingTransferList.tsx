import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getTransfersByStatus } from '@/services/inventaris-transfer.service';
import type { TransferWithItem } from '@/types/transfer.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PendingTransferListProps {
  onApprove: (transfer: TransferWithItem) => void;
  onReject: (transfer: TransferWithItem) => void;
}

export default function PendingTransferList({ onApprove, onReject }: PendingTransferListProps) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-transfers', page],
    queryFn: () => getTransfersByStatus('pending', page, limit),
  });

  // Setup realtime subscription for pending transfers
  useEffect(() => {
    // Subscribe to transfer_inventaris changes
    const channel = supabase
      .channel('pending-transfers-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transfer_inventaris',
          filter: `status=eq.pending AND tujuan=eq.koperasi`
        },
        (payload) => {
          console.log('Transfer change detected:', payload);
          
          // Invalidate and refetch the pending transfers query
          queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
          
          // Show notification based on event type
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'Transfer Baru',
              description: 'Ada transfer baru yang menunggu persetujuan',
            });
          } else if (payload.eventType === 'UPDATE') {
            // Check if status changed from pending
            const oldRecord = payload.old as any;
            const newRecord = payload.new as any;
            
            if (oldRecord?.status === 'pending' && newRecord?.status !== 'pending') {
              toast({
                title: 'Transfer Diproses',
                description: `Transfer telah ${newRecord.status === 'approved' ? 'disetujui' : 'ditolak'}`,
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">Memuat data transfer...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive">
          <p>Gagal memuat data: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  const transfers = data?.data || [];
  const totalPages = data?.totalPages || 1;

  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Pending</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Tidak ada transfer yang menunggu persetujuan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transfer Pending</CardTitle>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {data?.total || 0} Transfer
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">HPP Yayasan</TableHead>
                <TableHead>Tanggal Transfer</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transfer.item_name}</div>
                      {transfer.item_kategori && (
                        <div className="text-sm text-muted-foreground">
                          {transfer.item_kategori}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {transfer.jumlah} {transfer.item_satuan || 'unit'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {transfer.hpp_yayasan 
                        ? `Rp ${transfer.hpp_yayasan.toLocaleString('id-ID')}`
                        : '-'
                      }
                    </div>
                    {transfer.hpp_yayasan && (
                      <div className="text-sm text-muted-foreground">
                        per {transfer.item_satuan || 'unit'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {format(new Date(transfer.created_at), 'dd MMM yyyy', { locale: id })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(transfer.created_at), 'HH:mm', { locale: id })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onApprove(transfer)}
                        className="gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Terima
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(transfer)}
                        className="gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
