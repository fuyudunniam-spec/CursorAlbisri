import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileBarChart } from 'lucide-react';

const LaporanPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Koperasi</h1>
          <p className="text-gray-600 mt-1">Laporan penjualan, laba rugi, dan stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Laporan Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Laporan penjualan per periode, produk, dan kasir
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Pendapatan, HPP, biaya, dan laba bersih
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">Laporan Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Stock akhir, nilai stock, dan mutasi
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5" />
            Laporan - Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <FileBarChart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Fitur laporan sedang dalam pengembangan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanPage;
