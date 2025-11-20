import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  trend: {
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
  };
  selectedAccountName?: string;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, selectedAccountName }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTrend = (trend: number) => {
    if (trend === 0) return 'Tidak ada data bulan lalu';
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend}% dari bulan lalu`;
  };

  const cards: StatCard[] = [
    {
      title: 'Total Saldo',
      value: formatCurrency(stats.totalSaldo),
      trend: {
        value: formatTrend(5), // Mock trend for now
        isPositive: true,
      },
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-blue-600',
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: formatCurrency(stats.pemasukanBulanIni),
      trend: {
        value: formatTrend(stats.pemasukanTrend),
        isPositive: stats.pemasukanTrend >= 0,
      },
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green-600',
    },
    {
      title: 'Pengeluaran Bulan Ini',
      value: formatCurrency(stats.pengeluaranBulanIni),
      trend: {
        value: formatTrend(stats.pengeluaranTrend),
        isPositive: stats.pengeluaranTrend >= 0,
      },
      icon: <TrendingDown className="h-5 w-5" />,
      color: 'text-red-600',
    },
    {
      title: 'Transaksi Bulan Ini',
      value: stats.totalTransaksi.toString(),
      trend: {
        value: '3 pending',
        isPositive: true,
      },
      icon: <ArrowUpRight className="h-5 w-5" />,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Badge */}
      {selectedAccountName && (
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Filtered by: {selectedAccountName}
          </Badge>
        </div>
      )}

      {/* Simplified Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-all duration-200 rounded-xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={card.color}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mb-1">{card.value}</div>
              <div className={`flex items-center text-xs ${
                card.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {card.trend.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
