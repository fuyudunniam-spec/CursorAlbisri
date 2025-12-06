import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MasterKelasPage from './MasterKelasPage';
import PloatingKelasSimple from './PloatingKelasSimple';

const KelasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'master' | 'plotting'>('master');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'master' | 'plotting')} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kelas & Plotting</h1>
            <p className="text-muted-foreground">Kelola master kelas dan penempatan santri</p>
          </div>
          <TabsList>
            <TabsTrigger value="master">Master Kelas</TabsTrigger>
            <TabsTrigger value="plotting">Plotting Kelas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="master" className="space-y-6 mt-6">
          <MasterKelasPage />
        </TabsContent>

        <TabsContent value="plotting" className="space-y-6 mt-6">
          <PloatingKelasSimple />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KelasPage;

