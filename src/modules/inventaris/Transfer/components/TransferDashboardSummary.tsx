/**
 * Transfer Dashboard Summary Component
 * 
 * Displays summary cards, charts, and period aggregations for transfer data.
 * 
 * Requirements: AC-4.5
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, TrendingUp, ArrowRight, Store, Home, Utensils, Building2, HelpCircle, Download } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  getTransferSummaryByDestination,
  getTransferTrends,
  getPeriodSummary,
  type TransferSummaryByDestination,
  type TransferTrendData,
  type PeriodSummary
} from "@/services/inventaris-transfer.service";
import { exportTransferSummaryToExcel } from "@/utils/export/transferExporter";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const DESTINATION_COLORS: Record<string, string> = {
  koperasi: "#3b82f6",
  distribusi: "#10b981",
  dapur: "#f59e0b",
  asrama: "#8b5cf6",
  kantor: "#ec4899",
  lainnya: "#6b7280"
};

const DESTINATION_ICONS: Record<string, any> = {
  koperasi: Store,
  distribusi: Package,
  dapur: Utensils,
  asrama: Home,
  kantor: Building2,
  lainnya: HelpCircle
};

const DESTINATION_LABELS: Record<string, string> = {
  koperasi: "Koperasi",
  distribusi: "Distribusi Bantuan",
  dapur: "Dapur",
  asrama: "Asrama",
  kantor: "Kantor",
  lainnya: "Lainnya"
};

interface DateRange {
  from: Date;
  to: Date;
}

export function TransferDashboardSummary() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  const [summaryByDestination, setSummaryByDestination] = useState<TransferSummaryByDestination[]>([]);
  const [trends, setTrends] = useState<TransferTrendData[]>([]);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');

      const [summaryData, trendsData, periodData] = await Promise.all([
        getTransferSummaryByDestination(dateFrom, dateTo),
        getTransferTrends(dateFrom, dateTo),
        getPeriodSummary(dateFrom, dateTo)
      ]);

      setSummaryByDestination(summaryData);
      setTrends(trendsData);
      setPeriodSummary(periodData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
  };

  const setMonthRange = () => {
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleExportSummary = () => {
    try {
      if (!periodSummary || summaryByDestination.length === 0) {
        toast({
          title: "Tidak ada data",
          description: "Tidak ada data untuk diekspor",
          variant: "destructive"
        });
        return;
      }

      exportTransferSummaryToExcel(
        {
          byDestination: summaryByDestination.map(item => ({
            tujuan: item.tujuan,
            count: item.total_transfers,
            quantity: item.total_quantity,
            value: item.total_value
          })),
          byStatus: periodSummary.by_status.map(item => ({
            status: item.status,
            count: item.count
          })),
          trends: trends
        },
        dateRange
      );

      toast({
        title: "Export berhasil",
        description: "Summary transfer berhasil diekspor ke Excel"
      });
    } catch (error) {
      console.error('Error exporting summary:', error);
      toast({
        title: "Export gagal",
        description: "Gagal mengekspor summary",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dashboard Transfer Inventaris</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportSummary}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                7 Hari
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                30 Hari
              </Button>
              <Button variant="outline" size="sm" onClick={setMonthRange}>
                Bulan Ini
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd MMM", { locale: localeId })} - {format(dateRange.to, "dd MMM yyyy", { locale: localeId })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex">
                    <div className="p-3 border-r">
                      <p className="text-sm font-medium mb-2">Dari</p>
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                        locale={localeId}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium mb-2">Sampai</p>
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                        locale={localeId}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfer</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodSummary?.total_transfers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Transfer dalam periode ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kuantitas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodSummary?.total_quantity || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unit barang ditransfer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                summaryByDestination.reduce((sum, item) => sum + item.total_value, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Nilai HPP total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer by Destination Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryByDestination.map((item) => {
          const Icon = DESTINATION_ICONS[item.tujuan] || HelpCircle;
          const color = DESTINATION_COLORS[item.tujuan] || "#6b7280";
          
          return (
            <Card key={item.tujuan}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {DESTINATION_LABELS[item.tujuan] || item.tujuan}
                </CardTitle>
                <Icon className="h-4 w-4" style={{ color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.total_transfers}</div>
                <p className="text-xs text-muted-foreground">
                  {item.total_quantity} unit • {formatCurrency(item.total_value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Trend Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), "dd MMM", { locale: localeId })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), "dd MMMM yyyy", { locale: localeId })}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  name="Jumlah Transfer"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#10b981" 
                  name="Total Unit"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Destination Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi per Tujuan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summaryByDestination}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="tujuan" 
                  tickFormatter={(value) => DESTINATION_LABELS[value] || value}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => DESTINATION_LABELS[value] || value}
                  formatter={(value: number, name: string) => {
                    if (name === 'total_value') return formatCurrency(value);
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="total_transfers" fill="#3b82f6" name="Jumlah Transfer" />
                <Bar dataKey="total_quantity" fill="#10b981" name="Total Unit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {periodSummary && periodSummary.by_status.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {periodSummary.by_status.map((item) => (
                <div key={item.status} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <p className="text-sm text-muted-foreground capitalize">{item.status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
