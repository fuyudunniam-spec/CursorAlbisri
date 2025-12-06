import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, BarChart3 } from 'lucide-react';

interface SalesAnalyticsProps {
  hourlyData: Record<number, number>;
  dailyData: Record<string, number>;
  popularItems: Array<{ nama: string; jumlah: number; total: number }>;
  totalSales: number;
  totalRevenue: number;
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({
  hourlyData,
  dailyData,
  popularItems,
  totalSales,
  totalRevenue,
}) => {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare monthly chart data (group by month)
  const monthlyChartData = Object.entries(dailyData)
    .map(([date, total]) => {
      const d = new Date(date);
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        date,
        total
      };
    })
    .reduce((acc, item) => {
      if (!acc[item.month]) {
        acc[item.month] = 0;
      }
      acc[item.month] += item.total;
      return acc;
    }, {} as Record<string, number>);

  const monthlyData = Object.entries(monthlyChartData)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxValue }: { data: Array<{ hour: number; total: number }>, maxValue: number }) => {
    return (
      <div className="flex items-end justify-between gap-1 h-32">
        {data.map((item) => (
          <div key={item.hour} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all hover:from-green-600 hover:to-green-500"
              style={{
                height: `${maxValue > 0 ? (item.total / maxValue) * 100 : 0}%`,
                minHeight: item.total > 0 ? '4px' : '0',
              }}
              title={`${item.hour}:00 - ${formatRupiah(item.total)}`}
            />
            <span className="text-xs text-gray-500 mt-1">{item.hour}</span>
          </div>
        ))}
      </div>
    );
  };

  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.total), 1);

  // Elegant line chart component with grid
  const MonthlyLineChart = ({ data, maxValue }: { data: Array<{ month: string; total: number }>, maxValue: number }) => {
    const svgWidth = 800;
    const svgHeight = 280;
    const padding = { top: 30, right: 40, bottom: 60, left: 60 };
    const chartWidth = svgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    // Calculate points for line
    const points = data.map((item, index) => {
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (item.total / maxValue) * chartHeight;
      return { x, y, ...item };
    });

    // Create SVG path for line
    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    // Create area path (for gradient fill)
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Grid lines (5 horizontal lines)
    const gridLines = Array.from({ length: 5 }, (_, i) => {
      const y = padding.top + (i / 4) * chartHeight;
      const value = maxValue - (i / 4) * maxValue;
      return { y, value };
    });

    return (
      <div className="relative w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {gridLines.map((grid, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={grid.y}
                x2={padding.left + chartWidth}
                y2={grid.y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={grid.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7280"
                className="font-medium"
              >
                {formatRupiah(grid.value).replace('Rp', '').trim()}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#lineGradient)"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, idx) => {
            const monthDate = new Date(point.month + '-01');
            const monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'short' });
            const yearLabel = monthDate.getFullYear();
            return (
              <g key={idx}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="2.5"
                  className="cursor-pointer hover:r-7 transition-all"
                />
                <title>{`${monthLabel} ${yearLabel} - ${formatRupiah(point.total)}`}</title>
              </g>
            );
          })}

          {/* X-axis labels */}
          {points.map((point, idx) => {
            const monthDate = new Date(point.month + '-01');
            const monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'short' });
            const yearLabel = monthDate.getFullYear();
            return (
              <g key={idx}>
                <text
                  x={point.x}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                  fontWeight="600"
                >
                  {monthLabel}
                </text>
                <text
                  x={point.x}
                  y={padding.top + chartHeight + 35}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {yearLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatRupiah(totalRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">{totalSales} transaksi</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Rata-rata per Transaksi</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatRupiah(totalSales > 0 ? totalRevenue / totalSales : 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per transaksi</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart - Full Width */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800 font-semibold">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Fluktuasi Penjualan per Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <MonthlyLineChart data={monthlyData} maxValue={maxMonthlyValue} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Belum ada data penjualan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Items */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800 font-semibold">
            <Package className="w-5 h-5 text-emerald-600" />
            Item Paling Populer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {popularItems.length > 0 ? (
              popularItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.nama}</p>
                      <p className="text-xs text-gray-500">{item.jumlah} unit terjual</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatRupiah(item.total)}</p>
                    <p className="text-xs text-gray-500">Total revenue</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8">Belum ada data penjualan</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesAnalytics;

