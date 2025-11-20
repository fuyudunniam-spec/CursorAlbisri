import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, UserCheck, UserPlus } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';

const DashboardSantri = () => {
  const tabs = [
    { label: 'Data Santri', path: '/santri' },
    { label: 'Ploating Kelas', path: '/ploating-kelas' },
    { label: 'Program', path: '/program-santri' },
    { label: 'Approval', path: '/santri/approval' }
  ];

  return (
    <div>
      <ModuleHeader title="Dashboard Santri" tabs={tabs} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Santri Aktif</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">150</div>
            <p className="text-xs text-muted-foreground">+12% dari bulan lalu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Santri Mukim</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85</div>
            <p className="text-xs text-muted-foreground">57% dari total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Santri Non-Mukim</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65</div>
            <p className="text-xs text-muted-foreground">43% dari total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendaftar Baru</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSantri;
