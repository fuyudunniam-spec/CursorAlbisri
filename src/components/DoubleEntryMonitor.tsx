import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink,
  Database,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { 
  monitorDoubleEntry, 
  getAutoPostedSummary, 
  reconcileAutoPostedTransactions,
  getOrphanedKeuangan 
} from '@/services/keuangan.service';

interface DoubleEntryMonitorProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const DoubleEntryMonitor: React.FC<DoubleEntryMonitorProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Fetch monitoring data
  const { data: doubleEntries, isLoading: doubleEntriesLoading, refetch: refetchDoubleEntries } = useQuery({
    queryKey: ['double-entries'],
    queryFn: monitorDoubleEntry,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  const { data: autoPostedSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['auto-posted-summary'],
    queryFn: () => getAutoPostedSummary()
  });

  const { data: reconciliationData, isLoading: reconciliationLoading } = useQuery({
    queryKey: ['reconciliation-data'],
    queryFn: reconcileAutoPostedTransactions
  });

  const { data: orphanedEntries, isLoading: orphanedLoading } = useQuery({
    queryKey: ['orphaned-entries'],
    queryFn: getOrphanedKeuangan
  });

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastChecked(new Date());
        refetchDoubleEntries();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refetchDoubleEntries]);

  const hasIssues = (doubleEntries?.length || 0) > 0 || (orphanedEntries?.length || 0) > 0;
  const hasDoubleEntries = (doubleEntries?.length || 0) > 0;
  const hasOrphanedEntries = (orphanedEntries?.length || 0) > 0;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Memeriksa double entry...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Alert */}
      {hasIssues ? (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Peringatan:</strong> Ditemukan {doubleEntries?.length || 0} potential double entries dan {orphanedEntries?.length || 0} orphaned entries. 
            <Button variant="link" className="p-0 h-auto text-red-800 underline">
              Lihat detail
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Status Baik:</strong> Tidak ada double entry atau orphaned entries terdeteksi.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Double Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasDoubleEntries ? 'text-red-600' : 'text-green-600'}`}>
              {doubleEntries?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasDoubleEntries ? 'Perlu perhatian' : 'Tidak ada masalah'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orphaned Entries</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasOrphanedEntries ? 'text-orange-600' : 'text-green-600'}`}>
              {orphanedEntries?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasOrphanedEntries ? 'Perlu review' : 'Semua valid'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Posted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {autoPostedSummary?.reduce((sum, item) => sum + item.transaction_count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi auto-posted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Checked</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatDate(lastChecked.toISOString())}
            </div>
            <p className="text-xs text-muted-foreground">
              {autoRefresh ? 'Auto refresh aktif' : 'Manual check'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Issues */}
      {showDetails && (
        <div className="space-y-4">
          {/* Double Entries */}
          {hasDoubleEntries && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Potential Double Entries ({doubleEntries?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doubleEntries?.slice(0, 5).map((entry, index) => (
                    <div key={index} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-red-800">{entry.kategori}</div>
                          <div className="text-sm text-red-600">
                            {formatDate(entry.tanggal)} • {formatRupiah(entry.jumlah)}
                          </div>
                          <div className="text-xs text-red-500">
                            {entry.count} duplikat ditemukan
                          </div>
                        </div>
                        <Badge variant="destructive">Duplikat</Badge>
                      </div>
                    </div>
                  ))}
                  {(doubleEntries?.length || 0) > 5 && (
                    <div className="text-sm text-muted-foreground text-center">
                      +{(doubleEntries?.length || 0) - 5} entries lainnya
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orphaned Entries */}
          {hasOrphanedEntries && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <ExternalLink className="h-5 w-5" />
                  Orphaned Entries ({orphanedEntries?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orphanedEntries?.slice(0, 5).map((entry, index) => (
                    <div key={index} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-orange-800">{entry.kategori}</div>
                          <div className="text-sm text-orange-600">
                            {formatDate(entry.tanggal)} • {formatRupiah(entry.jumlah)}
                          </div>
                          <div className="text-xs text-orange-500">
                            Referensi: {entry.referensi}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-orange-600">
                          Orphaned
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(orphanedEntries?.length || 0) > 5 && (
                    <div className="text-sm text-muted-foreground text-center">
                      +{(orphanedEntries?.length || 0) - 5} entries lainnya
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto Posted Summary */}
          {autoPostedSummary && autoPostedSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                  Auto Posted Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {autoPostedSummary.map((summary, index) => (
                    <div key={index} className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-blue-800">{summary.source_module}</div>
                          <div className="text-sm text-blue-600">
                            {summary.transaction_count} transaksi • {formatRupiah(summary.total_amount)}
                          </div>
                          <div className="text-xs text-blue-500">
                            Rata-rata: {formatRupiah(summary.avg_amount)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-blue-600">
                          {summary.transaction_count} transaksi
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setLastChecked(new Date());
            refetchDoubleEntries();
          }}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Manual
        </Button>
        
        {showDetails && (
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            View Full Report
          </Button>
        )}
      </div>
    </div>
  );
};

export default DoubleEntryMonitor;
