import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Lock, Unlock } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: string;
}

interface SummaryCardsProps {
  stats: {
    totalSaldo: number;
    pemasukanBulanIni: number;
    pengeluaranBulanIni: number;
    totalTransaksi: number;
    pemasukanTrend: number;
    pengeluaranTrend: number;
    jumlahTransaksiPemasukan?: number;
    jumlahTransaksiPengeluaran?: number;
    danaTerikat?: number;
    danaTidakTerikat?: number;
    penyesuaianSaldoInfo?: {
      jumlah: number;
      jumlahTransaksi: number;
      adaPenyesuaian: boolean;
    };
  };
  selectedAccountName?: string;
  periodLabel?: string; // Label untuk periode yang dipilih (e.g., "Bulan Ini", "Bulan Lalu", "3 Bulan Terakhir")
  previousPeriodLabel?: string; // Label untuk periode sebelumnya (untuk trend)
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  stats, 
  selectedAccountName,
  periodLabel = 'Bulan Ini',
  previousPeriodLabel = 'periode sebelumnya'
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTrend = (trend: number) => {
    if (trend === 0) return `Tidak ada data ${previousPeriodLabel}`;
    // Round to 2 decimal places untuk menghindari angka terlalu panjang
    const roundedTrend = Math.round(trend * 100) / 100;
    const sign = roundedTrend >= 0 ? '+' : '';
    return `${sign}${roundedTrend.toFixed(2)}% dari ${previousPeriodLabel}`;
  };

  // Calculate dana terikat vs tidak terikat
  // Fallback: jika fund_type belum ada, semua dianggap tidak_terikat
  const danaTerikat = stats.danaTerikat ?? 0;
  const danaTidakTerikat = stats.danaTidakTerikat ?? stats.totalSaldo;
  const totalDana = danaTerikat + danaTidakTerikat;

  // Prepare penyesuaian saldo info for Total Saldo card
  const penyesuaianSaldoInfo = stats.penyesuaianSaldoInfo;
  let totalSaldoSubtitle: string | undefined;
  if (penyesuaianSaldoInfo?.adaPenyesuaian && penyesuaianSaldoInfo.jumlahTransaksi > 0) {
    const sign = penyesuaianSaldoInfo.jumlah >= 0 ? '+' : '';
    totalSaldoSubtitle = `Penyesuaian saldo: ${sign}${formatCurrency(Math.abs(penyesuaianSaldoInfo.jumlah))} (${penyesuaianSaldoInfo.jumlahTransaksi} transaksi)`;
  }

  const cards: StatCard[] = [
    {
      title: 'Total Saldo',
      value: formatCurrency(stats.totalSaldo),
      subtitle: totalSaldoSubtitle,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-blue-600',
    },
    {
      title: `Pemasukan ${periodLabel}`,
      value: formatCurrency(stats.pemasukanBulanIni),
      subtitle: `${stats.jumlahTransaksiPemasukan || 0} transaksi`,
      trend: stats.pemasukanTrend !== 0 ? {
        value: formatTrend(stats.pemasukanTrend),
        isPositive: stats.pemasukanTrend >= 0,
      } : undefined,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green-600',
    },
    {
      title: `Pengeluaran ${periodLabel}`,
      value: formatCurrency(stats.pengeluaranBulanIni),
      subtitle: `${stats.jumlahTransaksiPengeluaran || 0} transaksi`,
      trend: stats.pengeluaranTrend !== 0 ? {
        value: formatTrend(stats.pengeluaranTrend),
        isPositive: stats.pengeluaranTrend >= 0,
      } : undefined,
      icon: <TrendingDown className="h-5 w-5" />,
      color: 'text-red-600',
    },
    {
      title: 'Dana Terikat vs Tidak Terikat',
      value: `${formatCurrency(danaTerikat)} / ${formatCurrency(danaTidakTerikat)}`,
      subtitle: totalDana > 0 
        ? `Terikat: ${((danaTerikat / totalDana) * 100).toFixed(1)}% • Tidak Terikat: ${((danaTidakTerikat / totalDana) * 100).toFixed(1)}%`
        : 'Belum ada data',
      icon: danaTerikat > 0 ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Badge */}
      {selectedAccountName && (
        <div className="flex items-center">
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2.5 py-1">
            Filter: {selectedAccountName}
          </Badge>
        </div>
      )}

      {/* Summary Cards - 4 KPI Cards untuk Dashboard Keuangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200 rounded-lg border border-gray-200 bg-white" style={{ minHeight: '140px' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.title}
              </CardTitle>
              <div className={`${card.color} opacity-70`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight leading-tight">{card.value}</div>
              {card.subtitle && (
                <div className="text-xs text-gray-500 mb-2">{card.subtitle}</div>
              )}
              {card.trend && (
                <div className={`flex items-center text-xs ${
                  card.trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {card.trend.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  <span>{card.trend.value}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
