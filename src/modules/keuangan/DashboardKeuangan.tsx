import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { useQuery } from '@tanstack/react-query';
import { getKeuanganDashboardStats } from '@/services/keuangan.service';
import { DoubleEntryAlert } from '@/components/DoubleEntryAlert';

const DashboardKeuangan = () => {
  const tabs = [
    { label: 'Keuangan Umum', path: '/keuangan-v3' },
    { label: 'SPP & Tagihan', path: '/keuangan' },
    { label: 'Tabungan', path: '/tabungan' },
    { label: 'Donasi', path: '/donasi' }
  ];

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Real data dengan filter double entry
  const { data: stats, isLoading } = useQuery({
    queryKey: ['keuangan-dashboard'],
    queryFn: getKeuanganDashboardStats
  });

  if (isLoading) {
    return (
      <div>
        <ModuleHeader title="Dashboard Keuangan" tabs={tabs} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader title="Dashboard Keuangan" tabs={tabs} />
      
      <DoubleEntryAlert />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/keuangan-v3'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(stats?.totalSaldo || 0)}</div>
            <p className="text-xs text-muted-foreground">Semua akun kas</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/keuangan-v3'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pemasukan Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatRupiah(stats?.pemasukanBulanIni || 0)}</div>
            <p className="text-xs text-muted-foreground">Tanpa double entry</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/keuangan-v3'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran Bulan Ini</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatRupiah(stats?.pengeluaranBulanIni || 0)}</div>
            <p className="text-xs text-muted-foreground">Operasional & lainnya</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/keuangan'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tagihan</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTagihanCount || 0}</div>
            <p className="text-xs text-muted-foreground">Menunggu pembayaran</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardKeuangan;
