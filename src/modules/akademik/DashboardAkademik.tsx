import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Award, Activity } from 'lucide-react';
import ModuleHeader from '@/components/ModuleHeader';

const DashboardAkademik = () => {
  const tabs = [
    { label: 'Program Santri', path: '/program-santri' },
    { label: 'Bantuan', path: '/program-bantuan' },
    { label: 'Monitoring', path: '/monitoring' }
  ];

  return (
    <div>
      <ModuleHeader title="Dashboard Akademik" tabs={tabs} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Program</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Program aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penerima Bantuan</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">Santri penerima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring Aktif</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">120</div>
            <p className="text-xs text-muted-foreground">Kegiatan terpantau</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAkademik;
