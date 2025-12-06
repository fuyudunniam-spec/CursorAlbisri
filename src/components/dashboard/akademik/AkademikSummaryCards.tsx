import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Users, Activity, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: string;
}

interface AkademikSummaryCardsProps {
  stats: {
    totalKelas: number;
    totalSantri: number;
    totalAgendaAktif: number;
    totalPertemuan: number;
    rataKehadiran: number;
    totalAlfa: number;
  };
  monthLabel?: string;
}

const AkademikSummaryCards: React.FC<AkademikSummaryCardsProps> = ({ stats, monthLabel }) => {
  const cards: StatCard[] = [
    {
      title: 'Total Kelas',
      value: stats.totalKelas.toString(),
      icon: <Layers className="h-5 w-5" />,
      color: 'text-blue-600',
    },
    {
      title: 'Total Santri',
      value: stats.totalSantri.toString(),
      icon: <Users className="h-5 w-5" />,
      color: 'text-green-600',
    },
    {
      title: 'Rata Kehadiran',
      value: `${stats.rataKehadiran.toFixed(1)}%`,
      icon: <Activity className="h-5 w-5" />,
      color: 'text-purple-600',
    },
    {
      title: 'Total Alfa',
      value: stats.totalAlfa.toString(),
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Badge */}
      {monthLabel && (
        <div className="flex items-center">
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2.5 py-1">
            Periode: {monthLabel}
          </Badge>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow duration-200 rounded-lg border border-gray-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {card.title}
              </CardTitle>
              <div className={`${card.color} opacity-70`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-semibold text-gray-900 mb-1.5 tracking-tight">{card.value}</div>
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
              {index === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalAgendaAktif} agenda aktif
                </p>
              )}
              {index === 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Santri aktif dalam kelas
                </p>
              )}
              {index === 2 && (
                <p className="text-xs text-gray-500 mt-1">
                  Dari {stats.totalPertemuan} pertemuan
                </p>
              )}
              {index === 3 && (
                <p className="text-xs text-gray-500 mt-1">
                  Akumulasi alfa bulan ini
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AkademikSummaryCards;





