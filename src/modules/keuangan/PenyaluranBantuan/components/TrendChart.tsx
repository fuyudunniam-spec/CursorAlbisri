import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface TrendChartProps {
  data: Array<{
    month: string;
    finansial: number;
    barang: number;
    total: number;
  }>;
  loading?: boolean;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, loading = false }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2 text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs mb-1" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Tren Penyaluran Bantuan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Memuat data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Tren Penyaluran Bantuan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-gray-50 rounded-full">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800">Tidak Ada Data</h3>
              <p className="text-xs text-gray-500 mt-1">
                Belum ada data penyaluran bantuan untuk ditampilkan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Tren Penyaluran Bantuan
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Perkembangan penyaluran bantuan per bulan
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFinansial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorBarang" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="finansial"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorFinansial)"
                name="Finansial"
              />
              <Area
                type="monotone"
                dataKey="barang"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorBarang)"
                name="Barang"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendChart;








