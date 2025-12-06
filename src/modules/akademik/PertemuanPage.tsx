import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JurnalPertemuanPage from './JurnalPertemuanPage';
import PresensiKelasPage from './PresensiKelasPage';

const PertemuanPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'jurnal' | 'presensi'>('jurnal');

  // Auto-select tab berdasarkan path atau query param
  useEffect(() => {
    if (location.pathname.includes('/presensi') || searchParams.get('tab') === 'presensi') {
      setActiveTab('presensi');
    } else {
      setActiveTab('jurnal');
    }
  }, [location.pathname, searchParams]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'jurnal' | 'presensi')} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jadwal & Presensi</h1>
            <p className="text-muted-foreground">Kelola jadwal pertemuan dan presensi kelas</p>
          </div>
          <TabsList>
            <TabsTrigger value="jurnal">Jadwal</TabsTrigger>
            <TabsTrigger value="presensi">Presensi</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="jurnal" className="space-y-6 mt-6">
          <JurnalPertemuanPage />
        </TabsContent>

        <TabsContent value="presensi" className="space-y-6 mt-6">
          <PresensiKelasPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PertemuanPage;

