import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, Calendar, Trash2 } from 'lucide-react';
import { ExpiryAlert } from '@/types/inventaris.types';

interface ExpiryAlertsProps {
  items: Array<{
    id: string;
    nama_barang: string;
    tanggal_kedaluwarsa: string;
  }>;
}

const ExpiryAlerts: React.FC<ExpiryAlertsProps> = ({ items }) => {
  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysUntilExpiry: number): 'expired' | 'critical' | 'warning' => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'warning'; // This shouldn't happen as we filter for 30 days
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'expired': return 'Kadaluarsa';
      case 'critical': return 'Kritis';
      case 'warning': return 'Peringatan';
      default: return 'Normal';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired': return <Trash2 className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Categorize items
  const expiredItems = items.filter(item => {
    const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
    return days < 0;
  });

  const criticalItems = items.filter(item => {
    const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
    return days >= 0 && days <= 7;
  });

  const warningItems = items.filter(item => {
    const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
    return days > 7 && days <= 30;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDaysUntilExpiry = (days: number) => {
    if (days < 0) return `Kadaluarsa ${Math.abs(days)} hari yang lalu`;
    if (days === 0) return 'Kadaluarsa hari ini';
    if (days === 1) return 'Kadaluarsa besok';
    return `${days} hari lagi`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          Expiry Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{expiredItems.length}</div>
            <div className="text-sm text-muted-foreground">Kadaluarsa</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{criticalItems.length}</div>
            <div className="text-sm text-muted-foreground">Kritis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{warningItems.length}</div>
            <div className="text-sm text-muted-foreground">Peringatan</div>
          </div>
        </div>

        {/* Expired Items */}
        {expiredItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              Kadaluarsa ({expiredItems.length})
            </h4>
            <div className="space-y-2">
              {expiredItems.slice(0, 5).map((item) => {
                const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
                return (
                  <div
                    key={item.id}
                    className="p-3 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-red-800">{item.nama_barang}</div>
                        <div className="text-sm text-red-600">
                          {formatDate(item.tanggal_kedaluwarsa)} • {formatDaysUntilExpiry(days)}
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        Kadaluarsa
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {expiredItems.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{expiredItems.length - 5} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Critical Items */}
        {criticalItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Kritis - 7 Hari ({criticalItems.length})
            </h4>
            <div className="space-y-2">
              {criticalItems.slice(0, 5).map((item) => {
                const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
                return (
                  <div
                    key={item.id}
                    className="p-3 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-red-800">{item.nama_barang}</div>
                        <div className="text-sm text-red-600">
                          {formatDate(item.tanggal_kedaluwarsa)} • {formatDaysUntilExpiry(days)}
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Kritis
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {criticalItems.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{criticalItems.length - 5} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning Items */}
        {warningItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Peringatan - 30 Hari ({warningItems.length})
            </h4>
            <div className="space-y-2">
              {warningItems.slice(0, 5).map((item) => {
                const days = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
                return (
                  <div
                    key={item.id}
                    className="p-3 border border-orange-200 bg-orange-50 rounded-lg"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-orange-800">{item.nama_barang}</div>
                        <div className="text-sm text-orange-600">
                          {formatDate(item.tanggal_kedaluwarsa)} • {formatDaysUntilExpiry(days)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Peringatan
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {warningItems.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{warningItems.length - 5} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Alerts */}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada alert expiry</p>
            <p className="text-sm">Semua item masih dalam masa berlaku</p>
          </div>
        )}

        {/* Quick Actions */}
        {items.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Calendar className="h-4 w-4 mr-1" />
                Jadwal Expiry
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Export Alert
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryAlerts;
