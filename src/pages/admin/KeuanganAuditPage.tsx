import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, DollarSign, FileText } from 'lucide-react';

const KeuanganAuditPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Keuangan</h1>
          <p className="text-muted-foreground">
            Monitor dan audit transaksi auto-posted untuk mencegah double entry
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Posted</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">156</div>
            <p className="text-xs text-muted-foreground">
              Transaksi auto-posted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potensi Duplikasi</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <p className="text-xs text-muted-foreground">
              Perlu review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orphaned Entries</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
            <p className="text-xs text-muted-foreground">
              Entri tanpa source
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              Sistem berjalan normal
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Reconcile Transactions
            </Button>
            <Button variant="outline">
              View Duplicates
            </Button>
            <Button variant="outline">
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Audit Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Halaman untuk monitoring dan audit transaksi keuangan auto-posted.
            Fitur lengkap akan segera tersedia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuanganAuditPage;