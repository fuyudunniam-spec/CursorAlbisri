import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, FileText, TrendingUp, TrendingDown, DollarSign, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

interface FinancialSummary {
  total_pendapatan_koperasi: number;
  total_pendapatan_inventaris: number;
  total_pendapatan: number;
  total_hpp_koperasi: number;
  total_hpp_inventaris: number;
  total_hpp: number;
  total_beban: number;
  total_kewajiban_yayasan: number;
  total_margin_koperasi: number;
  laba_kotor: number;
  laba_bersih: number;
}

const LaporanKeuanganPage = () => {
  const [dateFilter, setDateFilter] = useState<string>('bulan-ini');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateFilter) {
      case 'hari-ini':
        start = now;
        end = now;
        break;
      case 'minggu-ini':
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'bulan-ini':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'bulan-lalu':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'tahun-ini':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const { start, end } = getDateRange();
  const finalStartDate = startDate || start;
  const finalEndDate = endDate || end;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['laporan-keuangan-summary', finalStartDate, finalEndDate],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_laporan_keuangan_summary', {
          p_start_date: finalStartDate || null,
          p_end_date: finalEndDate || null,
        });

        if (error) {
          throw new Error(`Gagal memuat laporan keuangan: ${error.message}`);
        }
        
        // RPC returns array of rows, get first row
        if (Array.isArray(data) && data.length > 0) {
          return data[0] as FinancialSummary;
        }
        // Fallback: return empty object with all fields set to 0
        return {
          total_pendapatan_koperasi: 0,
          total_pendapatan_inventaris: 0,
          total_pendapatan: 0,
          total_hpp_koperasi: 0,
          total_hpp_inventaris: 0,
          total_hpp: 0,
          total_beban: 0,
          total_kewajiban_yayasan: 0,
          total_margin_koperasi: 0,
          laba_kotor: 0,
          laba_bersih: 0,
        } as FinancialSummary;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal memuat laporan keuangan';
        toast.error(errorMessage);
        throw err;
      }
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    toast.info('Fitur export akan segera tersedia');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-gray-600 mt-1">
            Periode: {format(new Date(finalStartDate), 'd MMMM yyyy', { locale: localeId })} -{' '}
            {format(new Date(finalEndDate), 'd MMMM yyyy', { locale: localeId })}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hari-ini">Hari Ini</SelectItem>
              <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
              <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
              <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
              <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : formatCurrency(summary?.total_pendapatan || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Koperasi: {formatCurrency(summary?.total_pendapatan_koperasi || 0)} | Inventaris:{' '}
              {formatCurrency(summary?.total_pendapatan_inventaris || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total HPP</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : formatCurrency(summary?.total_hpp || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Koperasi: {formatCurrency(summary?.total_hpp_koperasi || 0)} | Inventaris:{' '}
              {formatCurrency(summary?.total_hpp_inventaris || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Kewajiban Yayasan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? '...' : formatCurrency(summary?.total_kewajiban_yayasan || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">HPP + Bagi Hasil</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Koperasi</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? '...' : formatCurrency(summary?.total_margin_koperasi || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Keuntungan koperasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Laba Rugi Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? '...' : formatCurrency(summary?.laba_kotor || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Pendapatan - HPP = {formatCurrency(summary?.total_pendapatan || 0)} -{' '}
              {formatCurrency(summary?.total_hpp || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laba Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {isLoading ? '...' : formatCurrency(summary?.laba_bersih || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Laba Kotor - Beban = {formatCurrency(summary?.laba_kotor || 0)} -{' '}
              {formatCurrency(summary?.total_beban || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Pendapatan Koperasi</span>
              <span className="font-mono">{formatCurrency(summary?.total_pendapatan_koperasi || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Pendapatan Inventaris</span>
              <span className="font-mono">{formatCurrency(summary?.total_pendapatan_inventaris || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b font-bold">
              <span>Total Pendapatan</span>
              <span className="font-mono text-green-600">{formatCurrency(summary?.total_pendapatan || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">HPP Koperasi</span>
              <span className="font-mono text-red-600">-{formatCurrency(summary?.total_hpp_koperasi || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">HPP Inventaris</span>
              <span className="font-mono text-red-600">-{formatCurrency(summary?.total_hpp_inventaris || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b font-bold">
              <span>Total HPP</span>
              <span className="font-mono text-red-600">-{formatCurrency(summary?.total_hpp || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b font-bold text-green-600">
              <span>Laba Kotor</span>
              <span className="font-mono">{formatCurrency(summary?.laba_kotor || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">Beban Operasional</span>
              <span className="font-mono text-red-600">-{formatCurrency(summary?.total_beban || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b font-bold text-blue-600">
              <span>Laba Bersih</span>
              <span className="font-mono">{formatCurrency(summary?.laba_bersih || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t-2 pt-4">
              <span className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Kewajiban ke Yayasan
              </span>
              <span className="font-mono text-blue-600">{formatCurrency(summary?.total_kewajiban_yayasan || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Margin Koperasi</span>
              <span className="font-mono text-purple-600">{formatCurrency(summary?.total_margin_koperasi || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanKeuanganPage;

