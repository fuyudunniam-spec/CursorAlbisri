import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  DollarSign, 
  Calendar, 
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Info,
  HandCoins
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatRupiah } from '@/utils/inventaris.utils';
import DistribusiSantriBinaan from './DistribusiSantriBinaan';

interface TagihanSummary {
  periode: string;
  total_tagihan: number;
  total_bayar: number;
  belum_lunas: number;
  jumlah_santri: number;
}

interface BeasiswaSummary {
  periode: string;
  total_pembayaran: number;
  jumlah_santri: number;
  komponen_terbanyak: string;
}

const FinanceReports: React.FC = () => {
  const [tagihanSummary, setTagihanSummary] = useState<TagihanSummary[]>([]);
  const [beasiswaSummary, setBeasiswaSummary] = useState<BeasiswaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterData, setFilterData] = useState({
    tahun: new Date().getFullYear(),
    bulan: new Date().getMonth() + 1,
    periode: 'bulanan' as 'bulanan' | 'tahunan'
  });

  useEffect(() => {
    loadReports();
  }, [filterData]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Load tagihan summary
      const { data: tagihanData, error: tagihanError } = await supabase
        .from('tagihan_santri')
        .select(`
          periode,
          nominal_tagihan,
          status_pembayaran,
          santri:santri_id(kategori)
        `)
        .gte('periode', `${filterData.tahun}-01`)
        .lte('periode', `${filterData.tahun}-12`);

      if (tagihanError) throw tagihanError;

      // Load beasiswa summary
      const { data: beasiswaData, error: beasiswaError } = await supabase
        .from('beasiswa_pembayaran')
        .select(`
          tanggal,
          nominal,
          jenis_komponen,
          santri_id
        `)
        .gte('tanggal', `${filterData.tahun}-01-01`)
        .lte('tanggal', `${filterData.tahun}-12-31`);

      if (beasiswaError) throw beasiswaError;

      // Process tagihan data
      const tagihanMap = new Map<string, TagihanSummary>();
      tagihanData?.forEach(item => {
        const key = item.periode;
        if (!tagihanMap.has(key)) {
          tagihanMap.set(key, {
            periode: key,
            total_tagihan: 0,
            total_bayar: 0,
            belum_lunas: 0,
            jumlah_santri: 0
          });
        }
        
        const summary = tagihanMap.get(key)!;
        summary.total_tagihan += item.nominal_tagihan;
        if (item.status_pembayaran === 'lunas') {
          summary.total_bayar += item.nominal_tagihan;
        } else {
          summary.belum_lunas += item.nominal_tagihan;
        }
        summary.jumlah_santri += 1;
      });

      setTagihanSummary(Array.from(tagihanMap.values()).sort((a, b) => a.periode.localeCompare(b.periode)));

      // Process beasiswa data
      const beasiswaMap = new Map<string, BeasiswaSummary>();
      const komponenCount = new Map<string, number>();
      
      beasiswaData?.forEach(item => {
        const key = item.tanggal.substring(0, 7); // YYYY-MM
        if (!beasiswaMap.has(key)) {
          beasiswaMap.set(key, {
            periode: key,
            total_pembayaran: 0,
            jumlah_santri: 0,
            komponen_terbanyak: ''
          });
        }
        
        const summary = beasiswaMap.get(key)!;
        summary.total_pembayaran += item.nominal;
        summary.jumlah_santri += 1;
        
        // Count komponen
        const count = komponenCount.get(item.jenis_komponen) || 0;
        komponenCount.set(item.jenis_komponen, count + 1);
      });

      // Set most frequent komponen for each period
      beasiswaMap.forEach((summary, key) => {
        const maxKomponen = Array.from(komponenCount.entries())
          .sort(([,a], [,b]) => b - a)[0];
        summary.komponen_terbanyak = maxKomponen?.[0] || '-';
      });

      setBeasiswaSummary(Array.from(beasiswaMap.values()).sort((a, b) => a.periode.localeCompare(b.periode)));

    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Gagal memuat laporan keuangan');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilterData(prev => ({ 
      ...prev, 
      [name]: name === 'tahun' || name === 'bulan' ? parseInt(value) : value 
    }));
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${filterData.tahun}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('File CSV berhasil diunduh');
  };

  const totalTagihan = tagihanSummary.reduce((sum, item) => sum + item.total_tagihan, 0);
  const totalBayar = tagihanSummary.reduce((sum, item) => sum + item.total_bayar, 0);
  const totalBeasiswa = beasiswaSummary.reduce((sum, item) => sum + item.total_pembayaran, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Memuat laporan keuangan...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Laporan Keuangan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ringkasan tagihan, pembayaran beasiswa, dan distribusi bantuan santri
          </p>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ringkasan Keuangan
          </TabsTrigger>
          <TabsTrigger value="distribusi" className="flex items-center gap-2">
            <HandCoins className="w-4 h-4" />
            Distribusi Santri Binaan
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">

      {/* Filter */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tahun">Tahun</Label>
              <Input
                id="tahun"
                name="tahun"
                type="number"
                value={filterData.tahun}
                onChange={handleFilterChange}
                min="2020"
                max="2030"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulan">Bulan (Opsional)</Label>
              <Select 
                name="bulan" 
                value={filterData.bulan.toString()} 
                onValueChange={(value) => setFilterData(prev => ({ ...prev, bulan: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Semua Bulan</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periode">Periode</Label>
              <Select 
                name="periode" 
                value={filterData.periode} 
                onValueChange={(value) => setFilterData(prev => ({ ...prev, periode: value as 'bulanan' | 'tahunan' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tagihan</p>
                <p className="text-2xl font-bold text-blue-600">{formatRupiah(totalTagihan)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bayar</p>
                <p className="text-2xl font-bold text-green-600">{formatRupiah(totalBayar)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Beasiswa</p>
                <p className="text-2xl font-bold text-purple-600">{formatRupiah(totalBeasiswa)}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tagihan Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ringkasan Tagihan</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(tagihanSummary, 'tagihan_summary')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tagihanSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada data tagihan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-right">Total Bayar</TableHead>
                  <TableHead className="text-right">Belum Lunas</TableHead>
                  <TableHead className="text-center">Jumlah Santri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagihanSummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.periode}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(item.total_tagihan)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatRupiah(item.total_bayar)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{formatRupiah(item.belum_lunas)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.jumlah_santri}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Beasiswa Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ringkasan Beasiswa Manual</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(beasiswaSummary, 'beasiswa_summary')}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {beasiswaSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Belum ada data beasiswa manual</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Total Pembayaran</TableHead>
                  <TableHead className="text-center">Jumlah Santri</TableHead>
                  <TableHead>Komponen Terbanyak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beasiswaSummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.periode}</TableCell>
                    <TableCell className="text-right font-medium text-purple-600">{formatRupiah(item.total_pembayaran)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.jumlah_santri}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.komponen_terbanyak}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Catatan:</strong> Laporan ini menampilkan data tagihan dan beasiswa manual. 
              Data dapat diekspor dalam format CSV untuk analisis lebih lanjut.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Distribusi Tab */}
        <TabsContent value="distribusi" className="space-y-6">
          <DistribusiSantriBinaan />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceReports;
