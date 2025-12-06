import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TruckIcon } from 'lucide-react';

const SupplierPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Master Supplier</h1>
          <p className="text-gray-600 mt-1">Kelola data supplier koperasi</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Daftar Supplier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Belum ada supplier. Klik "Tambah Supplier" untuk memulai.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPage;
