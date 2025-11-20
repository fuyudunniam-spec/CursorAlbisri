import { useState } from "react";

const InventarisV2Simple = () => {
  const [activeTab, setActiveTab] = useState("transaksi");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900">Modul Inventaris V2</h1>
          <p className="text-gray-600">Sistem manajemen inventaris modern</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">0</div>
              <p className="text-xs text-gray-500">Barang dalam inventaris</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">0</div>
              <p className="text-xs text-gray-500">Transaksi bulan ini</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Total Nilai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">Rp 0</div>
              <p className="text-xs text-gray-500">Nilai total inventaris</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Peringatan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">0</div>
              <p className="text-xs text-gray-500">Stok rendah & kedaluwarsa</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0">
                <TabsTrigger value="transaksi" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                  Transaksi
                </TabsTrigger>
                <TabsTrigger value="inventaris" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Inventaris
                </TabsTrigger>
                <TabsTrigger value="alerts" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="laporan" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                  Laporan
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="transaksi" className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaksi Inventaris</h3>
                <p className="text-gray-500 mb-4">Kelola transaksi masuk, keluar, dan stocktake</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  + Tambah Transaksi
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="inventaris" className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventaris Barang</h3>
                <p className="text-gray-500 mb-4">Kelola data master barang inventaris</p>
                <Button variant="outline">
                  + Tambah Item
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Peringatan Stok</h3>
                <p className="text-gray-500 mb-4">Monitor stok rendah dan barang kedaluwarsa</p>
                <div className="text-sm text-gray-400">
                  <p>• Stok rendah: 0 item</p>
                  <p>• Kedaluwarsa: 0 item</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="laporan" className="p-6">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Laporan Inventaris</h3>
                <p className="text-gray-500 mb-4">Fitur laporan akan segera tersedia</p>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>• Export CSV dengan filter</p>
                  <p>• Laporan PDF profesional</p>
                  <p>• Analisis trend stok</p>
                  <p>• Dashboard analytics</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InventarisV2Simple;
