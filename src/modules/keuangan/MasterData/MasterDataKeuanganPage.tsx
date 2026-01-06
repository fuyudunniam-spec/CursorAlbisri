import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Layers, Tag } from 'lucide-react';
import PilarLayananTab from './components/PilarLayananTab';
import KategoriPengeluaranTab from './components/KategoriPengeluaranTab';

const MasterDataKeuanganPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pilar' | 'kategori'>('pilar');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Data Keuangan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola pilar layanan dan kategori pengeluaran untuk keuangan umum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pilar' | 'kategori')}>
          <CardHeader className="pb-3">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pilar" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Pilar Layanan
              </TabsTrigger>
              <TabsTrigger value="kategori" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Kategori Pengeluaran
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="pilar" className="mt-0">
              <PilarLayananTab />
            </TabsContent>
            <TabsContent value="kategori" className="mt-0">
              <KategoriPengeluaranTab />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default MasterDataKeuanganPage;

