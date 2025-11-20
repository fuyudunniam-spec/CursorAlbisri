import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, Users } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';

const DashboardAdmin = () => {
  const tabs = [
    { label: 'Dokumen', path: '/santri/profile' },
    { label: 'Approval', path: '/santri/approval' },
    { label: 'Tagihan', path: '/tagihan-santri' }
  ];

  return (
    <div>
      <ModuleHeader title="Dashboard Administrasi" tabs={tabs} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokumen Terverifikasi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">Dokumen lengkap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Pengguna sistem</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAdmin;
