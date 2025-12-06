import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { koperasiService } from '@/services/koperasi.service';
import { Building2, FileText, Calendar, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const KewajibanYayasanPage = () => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['kewajiban-summary'],
    queryFn: () => koperasiService.getKewajibanKoperasiYayasan(),
    refetchInterval: 60000,
  });

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ['kewajiban-detail', dateFrom, dateTo],
    queryFn: () => koperasiService.getKewajibanDetail({
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    }),
    enabled: true,
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Fitur export akan segera tersedia');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            Kewajiban Koperasi ke Yayasan
          </h1>
          <p className="text-muted-foreground mt-1">
            Laporan kewajiban koperasi sebagai jasa penitipan dan pengolahan inventaris yayasan
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kewajiban</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summaryLoading ? '...' : formatRupiah(summary?.total_kewajiban || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dari semua penjualan
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HPP Barang Baik</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summaryLoading ? '...' : formatRupiah(summary?.total_hpp_terjual || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dibayar saat penjualan
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">70% Barang Rusak</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {summaryLoading ? '...' : formatRupiah(summary?.total_penjualan_rusak_yayasan || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bagian yayasan dari penjualan rusak
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Belum Dibayar</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {summaryLoading ? '...' : formatRupiah(summary?.total_belum_dibayar || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary && summary.total_kewajiban > 0
                ? `${Math.round((summary.total_belum_dibayar / summary.total_kewajiban) * 100)}% dari total`
                : '0% dari total'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-from">Dari Tanggal</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">Sampai Tanggal</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Kewajiban per Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !details || details.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada data kewajiban</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Struk</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">HPP/Unit</TableHead>
                    <TableHead className="text-right">Kewajiban</TableHead>
                    <TableHead className="text-right">Sudah Dibayar</TableHead>
                    <TableHead className="text-right">Belum Dibayar</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((detail: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {detail.tanggal_penjualan
                          ? format(new Date(detail.tanggal_penjualan), 'dd MMM yyyy', {
                              locale: localeId
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {detail.nomor_struk || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {detail.item_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            detail.kondisi_barang === 'baik'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-orange-100 text-orange-800 border-orange-300'
                          }
                        >
                          {detail.kondisi_barang === 'baik' ? 'Baik' : 'Rusak'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.jumlah_terjual || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(detail.harga_jual || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(detail.subtotal || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(detail.hpp_per_unit || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">
                        {formatRupiah(detail.total_kewajiban || 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        {formatRupiah(detail.sudah_dibayar || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-700">
                        {formatRupiah(detail.belum_dibayar || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            detail.status_pembayaran === 'Lunas'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }
                        >
                          {detail.status_pembayaran || 'Belum Lunas'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Cara Kerja Kewajiban</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>Barang Baik:</strong> Koperasi membayar HPP (Harga Pokok Penjualan) ke Yayasan saat barang terjual.
            Margin (harga jual - HPP) menjadi keuntungan koperasi.
          </p>
          <p>
            <strong>Barang Rusak:</strong> Dari hasil penjualan, 70% untuk Yayasan dan 30% untuk Koperasi (biaya operasional).
            Pembayaran dilakukan saat penjualan.
          </p>
          <p className="font-semibold mt-2">
            Total kewajiban = HPP barang baik yang terjual + 70% dari penjualan barang rusak
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KewajibanYayasanPage;




