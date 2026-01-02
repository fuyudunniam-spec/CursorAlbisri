import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Plus, ArrowDownCircle, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { formatRupiah } from "@/utils/inventaris.utils";
import { formatDate } from "@/utils/inventaris.utils";
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { ajukanPenarikan, listPermohonanSaya, listTransaksi } from '@/services/tabunganSantriClient';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";

interface ProfileContext {
  santriId: string;
  saldoTabungan: number;
}

interface WithdrawRequest {
  id: string;
  nominal: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'submitted';
  catatan_santri?: string;
  alasan_admin?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface Transaction {
  id: string;
  tanggal: string;
  jenis: string;
  nominal: number;
  saldo_sebelum: number;
  saldo_sesudah: number;
  deskripsi: string;
  catatan?: string;
  petugas_nama?: string;
  status?: string;
}

// Section Wrapper Component
const Section = ({ 
  title, 
  rightSlot, 
  children 
}: { 
  title: string; 
  rightSlot?: React.ReactNode; 
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

const TabunganPage = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { santriId: contextSantriId, saldoTabungan: initialSaldo } = useOutletContext<ProfileContext>();
  
  // Use route params as source of truth
  const santriId = params.id || contextSantriId;
  
  const [saldoTabungan, setSaldoTabungan] = useState(initialSaldo);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [showSetorDialog, setShowSetorDialog] = useState(false);
  const [showTarikDialog, setShowTarikDialog] = useState(false);
  const [setorAmount, setSetorAmount] = useState('');
  const [setorDescription, setSetorDescription] = useState('');
  const [tarikAmount, setTarikAmount] = useState('');
  const [tarikDescription, setTarikDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'Setoran' | 'Penarikan'>('all');

  // Calculate saldo from approved/completed transactions
  // Transactions in santri_tabungan are already approved/completed (they're actual transactions, not requests)
  const calculatedSaldo = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    
    // All transactions in santri_tabungan are already approved/completed
    // Calculate saldo from all transactions
    return transactions.reduce((acc, tx) => {
      if (tx.jenis === 'Setoran') {
        return acc + (tx.nominal || 0);
      } else if (tx.jenis === 'Penarikan') {
        return acc - (tx.nominal || 0);
      }
      return acc;
    }, 0);
  }, [transactions]);

  useEffect(() => {
    if (!santriId) {
      console.error('TabunganPage: santriId is missing');
      return;
    }
    
    loadSaldo();
    loadTransactions();
    loadWithdrawRequests();
  }, [santriId]);

  const loadSaldo = async () => {
    if (!santriId) return;
    try {
      setLoadingSaldo(true);
      // Try RPC first
      try {
        const saldo = await TabunganSantriService.getSaldoTabungan(santriId);
        setSaldoTabungan(saldo || 0);
      } catch (rpcError) {
        console.warn('RPC saldo failed, will calculate from transactions:', rpcError);
        // Will be recalculated from transactions
      }
    } catch (error) {
      console.error('Error loading saldo:', error);
    } finally {
      setLoadingSaldo(false);
    }
  };

  const loadTransactions = async () => {
    if (!santriId) return;
    try {
      setLoadingTransactions(true);
      const { data, error } = await listTransaksi(santriId, 1, 100); // Load more to calculate saldo accurately
      if (error) throw error;
      setTransactions(data || []);
      
      // Always recalculate saldo from transactions to ensure consistency
      // Use the latest transaction's saldo_sesudah if available, otherwise calculate
      if (data && data.length > 0) {
        // Get the most recent transaction's saldo_sesudah (most accurate)
        const latestTx = data[0];
        if (latestTx.saldo_sesudah !== undefined && latestTx.saldo_sesudah !== null) {
          setSaldoTabungan(latestTx.saldo_sesudah);
        } else {
          // Fallback: calculate from all transactions
          const calculated = data.reduce((acc: number, tx: Transaction) => {
            if (tx.jenis === 'Setoran') {
              return acc + (tx.nominal || 0);
            } else if (tx.jenis === 'Penarikan') {
              return acc - (tx.nominal || 0);
            }
            return acc;
          }, 0);
          setSaldoTabungan(calculated);
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Gagal memuat riwayat transaksi');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadWithdrawRequests = async () => {
    if (!santriId) return;
    try {
      setLoadingRequests(true);
      const data = await listPermohonanSaya(santriId);
      setWithdrawRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSetor = async () => {
    if (!santriId) {
      toast.error('ID Santri tidak ditemukan');
      return;
    }

    const nominal = parseFloat(setorAmount);
    if (!nominal || nominal <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('tabungan_setor_requests')
        .insert({
          santri_id: santriId,
          nominal: nominal,
          deskripsi: setorDescription || 'Setoran tabungan',
          status: 'submitted'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Permohonan setoran berhasil diajukan. Menunggu persetujuan admin.');
      setShowSetorDialog(false);
      setSetorAmount('');
      setSetorDescription('');
      loadWithdrawRequests();
    } catch (error: any) {
      console.error('Error submitting setor:', error);
      toast.error('Gagal mengajukan setoran: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTarik = async () => {
    if (!santriId) {
      toast.error('ID Santri tidak ditemukan');
      return;
    }

    const nominal = parseFloat(tarikAmount);
    if (!nominal || nominal <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    const currentSaldo = calculatedSaldo > 0 ? calculatedSaldo : saldoTabungan;
    if (nominal > currentSaldo) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    const hasPendingRequest = withdrawRequests.some(req => req.status === 'pending' || req.status === 'submitted');
    if (hasPendingRequest) {
      toast.error('Anda memiliki permohonan penarikan yang masih pending. Harap tunggu persetujuan admin.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ajukanPenarikan(santriId, nominal, tarikDescription);
      toast.success('Permohonan penarikan berhasil diajukan. Menunggu persetujuan admin.');
      setShowTarikDialog(false);
      setTarikAmount('');
      setTarikDescription('');
      loadWithdrawRequests();
    } catch (error: any) {
      console.error('Error submitting tarik:', error);
      toast.error('Gagal mengajukan penarikan: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Ditolak</Badge>;
      case 'pending':
      case 'submitted':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Menunggu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType === 'all') return true;
      return t.jenis === filterType;
    });
  }, [transactions, filterType]);

  const hasPendingRequest = withdrawRequests.some(req => req.status === 'pending' || req.status === 'submitted');
  // Use calculated saldo from transactions as source of truth, fallback to state saldo
  const displaySaldo = calculatedSaldo !== 0 ? calculatedSaldo : saldoTabungan;

  return (
    <div className="space-y-6 mt-6">
      {/* Saldo Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Saldo Tabungan Saat Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSaldo ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary/30 animate-spin" />
              <p className="text-sm text-muted-foreground">Memuat saldo...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl font-bold text-emerald-900 mb-4">
                {formatRupiah(displaySaldo)}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSetorDialog(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Tabungan
                </Button>
                <Button
                  onClick={() => setShowTarikDialog(true)}
                  disabled={displaySaldo <= 0 || hasPendingRequest}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Tarik Tabungan
                </Button>
              </div>
              {hasPendingRequest && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Anda memiliki permohonan penarikan yang sedang menunggu persetujuan</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Permohonan - Judul DI LUAR Card */}
      {withdrawRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Status Permohonan</h2>
          
          <div className="space-y-3">
            {withdrawRequests.map((req) => (
              <div key={req.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-lg font-semibold text-foreground">{formatRupiah(req.nominal)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatDate(req.created_at)}
                    </p>
                    {req.catatan_santri && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Catatan:</span> {req.catatan_santri}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(req.status)}
                  </div>
                </div>
                
                {req.alasan_admin && (
                  <div className={cn(
                    "mt-3 pt-3 border-t",
                    req.status === 'rejected' ? "text-red-600" : "text-muted-foreground"
                  )}>
                    <p className="text-sm">
                      <span className="font-medium">
                        {req.status === 'rejected' ? 'Alasan ditolak: ' : 'Catatan admin: '}
                      </span>
                      {req.alasan_admin}
                    </p>
                  </div>
                )}
                
                {req.approved_at && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Disetujui pada: {formatDate(req.approved_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riwayat Transaksi - Judul DI LUAR Card/Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Riwayat Transaksi</h2>
        
        <Card>
          <CardHeader>
            <div className="flex justify-end">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Setoran">Setor</SelectItem>
                  <SelectItem value="Penarikan">Tarik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary/30 animate-spin" />
                <p className="text-sm text-muted-foreground">Memuat transaksi...</p>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Saldo Setelah</TableHead>
                      <TableHead>Deskripsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.tanggal)}</TableCell>
                        <TableCell>
                          <Badge variant={tx.jenis === 'Setoran' ? 'default' : 'secondary'}>
                            {tx.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "font-semibold",
                          tx.jenis === 'Setoran' ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.jenis === 'Setoran' ? '+' : '-'}{formatRupiah(tx.nominal)}
                        </TableCell>
                        <TableCell>{formatRupiah(tx.saldo_sesudah)}</TableCell>
                        <TableCell>{tx.deskripsi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada transaksi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setor Dialog */}
      <Dialog open={showSetorDialog} onOpenChange={setShowSetorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tabungan</DialogTitle>
            <DialogDescription>
              Ajukan permohonan setoran tabungan. Permohonan akan ditinjau oleh admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nominal (Rp)</Label>
              <Input
                type="number"
                value={setorAmount}
                onChange={(e) => setSetorAmount(e.target.value)}
                placeholder="Masukkan nominal"
                min="0"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={setorDescription}
                onChange={(e) => setSetorDescription(e.target.value)}
                placeholder="Keterangan setoran (opsional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetorDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSetor}
              disabled={isSubmitting || !setorAmount || parseFloat(setorAmount) <= 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Ajukan Setoran'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tarik Dialog */}
      <Dialog open={showTarikDialog} onOpenChange={setShowTarikDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Tabungan</DialogTitle>
            <DialogDescription>
              Ajukan permohonan penarikan tabungan. Permohonan akan ditinjau oleh admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nominal (Rp)</Label>
              <Input
                type="number"
                value={tarikAmount}
                onChange={(e) => setTarikAmount(e.target.value)}
                placeholder="Masukkan nominal"
                min="0"
                max={displaySaldo}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Saldo saat ini: <span className="font-semibold text-primary">{formatRupiah(displaySaldo)}</span>
              </p>
            </div>
            {tarikAmount && parseFloat(tarikAmount) > displaySaldo && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  Nominal melebihi saldo yang tersedia
                </p>
              </div>
            )}
            <div>
              <Label>Catatan</Label>
              <Textarea
                value={tarikDescription}
                onChange={(e) => setTarikDescription(e.target.value)}
                placeholder="Alasan penarikan (opsional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTarikDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleTarik}
              disabled={isSubmitting || !tarikAmount || parseFloat(tarikAmount) <= 0 || parseFloat(tarikAmount) > displaySaldo}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Ajukan Penarikan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabunganPage;
