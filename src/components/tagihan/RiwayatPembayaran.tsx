import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Edit,
  Trash2,
  Printer,
  Eye,
  Calendar,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { TagihanService, type PembayaranSantri } from '@/services/tagihan.service';
import { supabase } from '@/integrations/supabase/client';
import KwitansiPembayaranSPP from './KwitansiPembayaranSPP';

interface RiwayatPembayaranProps {
  tagihanId?: string;
  santriId?: string;
  santriIds?: string[]; // Support multiple santri IDs
}

const RiwayatPembayaran: React.FC<RiwayatPembayaranProps> = ({ tagihanId, santriId, santriIds }) => {
  const [payments, setPayments] = useState<PembayaranSantri[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSumber, setFilterSumber] = useState<string>('all');
  const [filterTanggalMulai, setFilterTanggalMulai] = useState('');
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState('');
  
  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showKwitansi, setShowKwitansi] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PembayaranSantri | null>(null);
  const [donaturList, setDonaturList] = useState<any[]>([]);
  
  // Edit form
  const [editForm, setEditForm] = useState<Partial<PembayaranSantri>>({});

  useEffect(() => {
    loadPayments();
    loadDonaturOptions();
  }, [tagihanId, santriId, santriIds, filterSumber, filterTanggalMulai, filterTanggalSelesai]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      let data: PembayaranSantri[];
      
      if (tagihanId) {
        data = await TagihanService.getPaymentHistory(tagihanId);
      } else {
        const filters: any = {};
        // Support multiple santri IDs
        if (santriIds && santriIds.length > 0) {
          filters.santri_ids = santriIds;
        } else if (santriId) {
          filters.santri_id = santriId;
        }
        if (filterSumber !== 'all') filters.sumber_pembayaran = filterSumber;
        if (filterTanggalMulai) filters.tanggal_mulai = filterTanggalMulai;
        if (filterTanggalSelesai) filters.tanggal_selesai = filterTanggalSelesai;
        if (searchTerm) filters.search = searchTerm;
        
        data = await TagihanService.getAllPayments(filters);
      }
      
      setPayments(data);
    } catch (error: any) {
      toast.error('Gagal memuat riwayat pembayaran: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDonaturOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_name, kategori_donasi, status_setoran')
        .eq('kategori_donasi', 'Orang Tua Asuh Pendidikan')
        .eq('status_setoran', 'Sudah disetor')
        .order('donor_name');

      if (error) throw error;
      setDonaturList(data || []);
    } catch (error) {
      console.error('Error loading donatur options:', error);
    }
  };

  const handleEdit = (payment: PembayaranSantri) => {
    setSelectedPayment(payment);
    setEditForm({
      jumlah_bayar: payment.jumlah_bayar,
      tanggal_bayar: payment.tanggal_bayar,
      metode_pembayaran: payment.metode_pembayaran,
      sumber_pembayaran: payment.sumber_pembayaran,
      donatur_id: payment.donatur_id,
      catatan: payment.catatan,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedPayment) return;

    try {
      await TagihanService.updatePayment(selectedPayment.id!, editForm);
      toast.success('Pembayaran berhasil diperbarui');
      setShowEditDialog(false);
      setSelectedPayment(null);
      loadPayments();
    } catch (error: any) {
      toast.error('Gagal memperbarui pembayaran: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pembayaran ini? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      await TagihanService.deletePayment(id);
      toast.success('Pembayaran berhasil dihapus');
      loadPayments();
    } catch (error: any) {
      toast.error('Gagal menghapus pembayaran: ' + error.message);
    }
  };

  const handleView = async (payment: PembayaranSantri) => {
    try {
      const fullPayment = await TagihanService.getPaymentById(payment.id!);
      if (fullPayment) {
        setSelectedPayment(fullPayment as any);
        setShowViewDialog(true);
      }
    } catch (error: any) {
      toast.error('Gagal memuat detail pembayaran: ' + error.message);
    }
  };

  const handlePrintKwitansi = async (payment: PembayaranSantri) => {
    try {
      const fullPayment = await TagihanService.getPaymentById(payment.id!);
      if (fullPayment) {
        setSelectedPayment(fullPayment as any);
        setShowKwitansi(true);
      }
    } catch (error: any) {
      toast.error('Gagal memuat data kwitansi: ' + error.message);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTanggal = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSumberPembayaranLabel = (sumber: string) => {
    const labels: Record<string, string> = {
      'orang_tua': 'Orang Tua',
      'donatur': 'Orang Tua Asuh Pendidikan',
      'yayasan': 'Yayasan',
    };
    return labels[sumber] || sumber;
  };

  const filteredPayments = payments.filter(payment => {
    const matchSearch = !searchTerm || 
      payment.nomor_referensi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.catatan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.santri as any)?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchSearch;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Riwayat Pembayaran</span>
            <Badge variant="outline">{filteredPayments.length} pembayaran</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari nomor referensi, catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSumber} onValueChange={setFilterSumber}>
              <SelectTrigger>
                <SelectValue placeholder="Sumber Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sumber</SelectItem>
                <SelectItem value="orang_tua">Orang Tua</SelectItem>
                <SelectItem value="donatur">Orang Tua Asuh Pendidikan</SelectItem>
                <SelectItem value="yayasan">Yayasan</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Tanggal Mulai"
              value={filterTanggalMulai}
              onChange={(e) => setFilterTanggalMulai(e.target.value)}
            />
            <Input
              type="date"
              placeholder="Tanggal Selesai"
              value={filterTanggalSelesai}
              onChange={(e) => setFilterTanggalSelesai(e.target.value)}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada data pembayaran</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nomor Referensi</TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatTanggal(payment.tanggal_bayar)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.nomor_referensi || '-'}
                      </TableCell>
                      <TableCell>
                        {(payment.santri as any)?.nama_lengkap || '-'}
                        {(payment.santri as any)?.id_santri && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({(payment.santri as any).id_santri})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(payment.jumlah_bayar)}
                      </TableCell>
                      <TableCell>{payment.metode_pembayaran}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getSumberPembayaranLabel(payment.sumber_pembayaran || '')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(payment.tagihan as any)?.bulan || ''} {(payment.tagihan as any)?.periode || ''}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(payment)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintKwitansi(payment)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(payment.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              Ubah informasi pembayaran
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Bayar *</Label>
                <Input
                  type="number"
                  value={editForm.jumlah_bayar}
                  onChange={(e) => setEditForm({ ...editForm, jumlah_bayar: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Bayar *</Label>
                <Input
                  type="date"
                  value={editForm.tanggal_bayar}
                  onChange={(e) => setEditForm({ ...editForm, tanggal_bayar: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metode Pembayaran *</Label>
                <Select
                  value={editForm.metode_pembayaran}
                  onValueChange={(value) => setEditForm({ ...editForm, metode_pembayaran: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tunai">Tunai</SelectItem>
                    <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                    <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sumber Pembayaran *</Label>
                <Select
                  value={editForm.sumber_pembayaran}
                  onValueChange={(value) => {
                    const sumberPembayaran = value as 'orang_tua' | 'donatur' | 'yayasan';
                    // Update is_kas_bergerak berdasarkan sumber_pembayaran
                    const isKasBergerak = sumberPembayaran !== 'yayasan';
                    setEditForm({ 
                      ...editForm, 
                      sumber_pembayaran: sumberPembayaran,
                      is_kas_bergerak: isKasBergerak,
                      // Clear donatur_id jika bukan donatur
                      donatur_id: sumberPembayaran === 'donatur' ? editForm.donatur_id : undefined
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orang_tua">Orang Tua / Wali</SelectItem>
                    <SelectItem value="donatur">Orang Tua Asuh Pendidikan</SelectItem>
                    <SelectItem value="yayasan">Yayasan</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.sumber_pembayaran === 'yayasan' && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Pembayaran yayasan tidak akan masuk ke akun kas (alokasi internal)
                  </p>
                )}
              </div>
            </div>
            {editForm.sumber_pembayaran === 'donatur' && (
              <div className="space-y-2">
                <Label>Pilih Orang Tua Asuh Pendidikan *</Label>
                <Select
                  value={editForm.donatur_id}
                  onValueChange={(value) => setEditForm({ ...editForm, donatur_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih orang tua asuh pendidikan" />
                  </SelectTrigger>
                  <SelectContent>
                    {donaturList.map(donatur => (
                      <SelectItem key={donatur.id} value={donatur.id}>
                        {donatur.donor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={editForm.catatan}
                onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Nomor Referensi</Label>
                  <p className="font-mono">{selectedPayment.nomor_referensi || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Tanggal</Label>
                  <p>{formatTanggal(selectedPayment.tanggal_bayar)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Jumlah</Label>
                  <p className="font-semibold">{formatRupiah(selectedPayment.jumlah_bayar)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Metode</Label>
                  <p>{selectedPayment.metode_pembayaran}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Sumber</Label>
                  <p>{getSumberPembayaranLabel(selectedPayment.sumber_pembayaran || '')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Santri</Label>
                  <p>{(selectedPayment.santri as any)?.nama_lengkap || '-'}</p>
                </div>
              </div>
              {selectedPayment.catatan && (
                <div>
                  <Label className="text-gray-500">Catatan</Label>
                  <p>{selectedPayment.catatan}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Tutup
            </Button>
            {selectedPayment && (
              <Button onClick={() => {
                setShowViewDialog(false);
                handlePrintKwitansi(selectedPayment);
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Cetak Kwitansi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kwitansi Dialog */}
      {selectedPayment && (
        <KwitansiPembayaranSPP
          pembayaran={selectedPayment as any}
          isOpen={showKwitansi}
          onClose={() => {
            setShowKwitansi(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
};

export default RiwayatPembayaran;

