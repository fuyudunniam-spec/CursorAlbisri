import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Store, ChefHat, HandHeart, TrendingUp, ArrowRight, Download, Calendar, BarChart3 } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';
import { TransferFormDialog } from './components/TransferFormDialog';
import { TransferHistoryList } from './components/TransferHistoryList';
import { TransferDashboardSummary } from './components/TransferDashboardSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { getTransferSummaryByChannel, getChannelLabel } from '@/services/inventaris-transfer-channel.service';
import { format } from 'date-fns';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Input } from '@/components/ui/input';

/**
 * Transfer Inventaris Page - Redesigned
 * 
 * Menggunakan channel tracking dari transaksi_inventaris
 * Terminologi: "Estimasi Harga Perolehan" (bukan HPP)
 * Desain clean dan modern seperti finance dashboard
 */
export default function TransferInventarisPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'month' | 'custom'>('month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Transfer', path: '/inventaris/transfer' },
    { label: 'Distribusi', path: '/inventaris/distribution' }
  ];

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case '7d':
        return {
          from: format(subDays(today, 7), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd')
        };
      case '30d':
        return {
          from: format(subDays(today, 30), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd')
        };
      case 'month':
        return {
          from: format(startOfMonth(today), 'yyyy-MM-dd'),
          to: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          from: customDateFrom || format(startOfMonth(today), 'yyyy-MM-dd'),
          to: customDateTo || format(endOfMonth(today), 'yyyy-MM-dd')
        };
      default:
        return {
          from: format(startOfMonth(today), 'yyyy-MM-dd'),
          to: format(endOfMonth(today), 'yyyy-MM-dd')
        };
    }
  };

  const dateRangeObj = getDateRange();

  // Fetch summary data for current month (top cards)
  const { data: currentMonthSummary } = useQuery({
    queryKey: ['transfer-summary-channel', 'current-month'],
    queryFn: async () => {
      const dateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const dateTo = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      return await getTransferSummaryByChannel(dateFrom, dateTo);
    },
  });

  // Fetch summary data for selected period (dashboard cards)
  const { data: periodSummary } = useQuery({
    queryKey: ['transfer-summary-channel', dateRangeObj.from, dateRangeObj.to],
    queryFn: async () => {
      return await getTransferSummaryByChannel(dateRangeObj.from, dateRangeObj.to);
    },
  });

  // Calculate totals
  const currentMonthTotals = {
    transfers: currentMonthSummary?.reduce((sum, item) => sum + item.total_transfers, 0) || 0,
    quantity: currentMonthSummary?.reduce((sum, item) => sum + item.total_quantity, 0) || 0,
    value: currentMonthSummary?.reduce((sum, item) => sum + item.total_value, 0) || 0
  };

  const periodTotals = {
    transfers: periodSummary?.reduce((sum, item) => sum + item.total_transfers, 0) || 0,
    quantity: periodSummary?.reduce((sum, item) => sum + item.total_quantity, 0) || 0,
    value: periodSummary?.reduce((sum, item) => sum + item.total_value, 0) || 0
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getChannelIcon = (channel: string | null) => {
    switch (channel) {
      case 'koperasi':
        return <Store className="h-5 w-5" />;
      case 'dapur':
        return <ChefHat className="h-5 w-5" />;
      case 'distribusi_bantuan':
        return <HandHeart className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Transfer Inventaris" tabs={tabs} />
      
      {/* Header Section - Clean Design */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transfer Inventaris</h2>
          <p className="text-sm text-gray-600 mt-1">
            Lacak distribusi komoditas Al-Bisri dari donatur
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Transfer Baru
        </Button>
      </div>

      {/* Top Summary Cards - Current Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Transfer
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthTotals.transfers}</div>
            <p className="text-xs text-gray-500 mt-1">Transfer bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Kuantitas
            </CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthTotals.quantity.toLocaleString('id-ID')}</div>
            <p className="text-xs text-gray-500 mt-1">Unit ditransfer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Estimasi Nilai Perolehan
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonthTotals.value)}</div>
            <p className="text-xs text-gray-500 mt-1">Bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history">
              <Package className="h-4 w-4 mr-2" />
              Riwayat Transfer
            </TabsTrigger>
          </TabsList>

          {/* Date Range Selector & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={dateRange === '7d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange('7d')}
                className="h-8"
              >
                7 Hari
              </Button>
              <Button
                variant={dateRange === '30d' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange('30d')}
                className="h-8"
              >
                30 Hari
              </Button>
              <Button
                variant={dateRange === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange('month')}
                className="h-8"
              >
                Bulan Ini
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange('custom')}
                className="h-8"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Custom
              </Button>
            </div>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-8 w-32"
                />
                <span className="text-sm text-gray-500">-</span>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="h-8 w-32"
                />
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Period Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Transfer
                </CardTitle>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periodTotals.transfers}</div>
                <p className="text-xs text-gray-500 mt-1">Transfer dalam periode ini</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Kuantitas
                </CardTitle>
                <Package className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periodTotals.quantity.toLocaleString('id-ID')}</div>
                <p className="text-xs text-gray-500 mt-1">Unit barang ditransfer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Estimasi Nilai Perolehan
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(periodTotals.value)}</div>
                <p className="text-xs text-gray-500 mt-1">Estimasi harga perolehan total</p>
              </CardContent>
            </Card>
          </div>

          {/* Channel Breakdown */}
          {periodSummary && periodSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Distribusi per Channel</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(dateRangeObj.from), 'dd MMM')} - {format(new Date(dateRangeObj.to), 'dd MMM yyyy')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {periodSummary.map((item) => (
                    <div
                      key={item.channel || 'unknown'}
                      className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-gray-600">
                          {getChannelIcon(item.channel)}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {getChannelLabel(item.channel)}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {item.total_transfers}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {item.total_quantity.toLocaleString('id-ID')} unit
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {formatCurrency(item.total_value)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dashboard Summary Component */}
          <TransferDashboardSummary />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TransferHistoryList 
            key={activeTab}
            onRefresh={() => {
              // Refresh handled by component
            }} 
          />
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <TransferFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          // Refresh data
          window.location.reload();
        }}
      />
    </div>
  );
}
