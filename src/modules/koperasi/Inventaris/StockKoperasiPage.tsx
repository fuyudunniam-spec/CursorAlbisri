import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';

const StockKoperasiPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Koperasi</h1>
          <p className="text-gray-600 mt-1">Inventaris produk koperasi</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            Daftar Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Warehouse className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Belum ada stock. Tambahkan produk terlebih dahulu.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockKoperasiPage;
