import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InventoryTable from "@/components/inventaris/InventoryTable";
import InventoryFilters from "@/components/inventaris/InventoryFilters";
import InventoryForm from "@/components/inventaris/InventoryForm";
import TransactionForm from "@/components/inventaris/TransactionForm";
import TransactionTable from "@/components/inventaris/TransactionTable";
import TransactionTableWithBulk from "@/components/inventaris/TransactionTableWithBulk";
import TransactionBulkActions from "@/components/inventaris/TransactionBulkActions";
import AlertsPanel from "@/components/inventaris/AlertsPanel";
import ModernStatsCards from "@/components/inventaris/ModernStatsCards";
import ModernInventoryTable from "@/components/inventaris/ModernInventoryTable";
import ModernTransactionTable from "@/components/inventaris/ModernTransactionTable";
import CompactTransactionTable from "@/components/inventaris/CompactTransactionTable";
import ModernAlertsPanel from "@/components/inventaris/ModernAlertsPanel";
import SalesSummaryPanel from "@/components/inventaris/SalesSummaryPanel";
import { useInventoryList, useDeleteInventoryItem } from "@/hooks/useInventory";
import { useInventoryTransactions, useDeleteTransaction, useCreateTransaction } from "@/hooks/useInventoryTransactions";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { useSalesSummary } from "@/hooks/useSalesSummary";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/utils/inventaris.utils";
import ExportMenu from "@/components/inventaris/ExportMenu";
import StockAdjustDialog from "@/components/inventaris/StockAdjustDialog";
import MassDistributionForm from "@/components/inventaris/MassDistributionForm";
import SalesDetailModal from "@/components/inventaris/SalesDetailModal";

const DEFAULT_PAGE_SIZE = 20;

type FilterState = {
  search: string;
  kategori: string;
  kondisi: string;
  tipe_item: string;
  zona: string;
  lokasi: string;
};

const InventarisV2 = () => {
  const { user, hasPermission, isAdmin, isStaff } = useAuth();
  const [activeTab, setActiveTab] = useState<"transaksi" | "inventaris" | "alerts" | "laporan" | "penjualan">("transaksi");
  const [page, setPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    kategori: "all",
    kondisi: "all",
    tipe_item: "all",
    zona: "all",
    lokasi: ""
  });
  
  const [txFilters, setTxFilters] = useState({
    search: "",
    tipe: "all" as "all" | "Masuk" | "Keluar" | "Stocktake",
    startDate: "",
    endDate: ""
  });

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedTxSearch = useDebounce(txFilters.search, 300);

  // Pagination
  const pagination = useMemo(() => ({ page, pageSize: DEFAULT_PAGE_SIZE }), [page]);
  const txPagination = useMemo(() => ({ page: txPage, pageSize: DEFAULT_PAGE_SIZE }), [txPage]);
  
  // Filters for API
  const apiFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    kategori: filters.kategori !== "all" ? filters.kategori : undefined,
    kondisi: filters.kondisi !== "all" ? filters.kondisi : undefined,
    tipe_item: filters.tipe_item !== "all" ? filters.tipe_item : undefined,
    zona: filters.zona !== "all" ? filters.zona : undefined,
    lokasi: filters.lokasi || undefined,
  }), [debouncedSearch, filters]);

  const txApiFilters = useMemo(() => ({
    search: debouncedTxSearch || undefined,
    tipe: txFilters.tipe !== "all" ? txFilters.tipe : undefined,
    startDate: txFilters.startDate || undefined,
    endDate: txFilters.endDate || undefined,
  }), [debouncedTxSearch, txFilters]);

  const sort = useMemo(() => ({ column: "created_at", direction: "desc" as const }), []);

  // Data fetching
  const { data, isFetching } = useInventoryList(pagination, apiFilters, sort);
  const { data: txData, isFetching: txLoading } = useInventoryTransactions(txPagination, txApiFilters, sort);
  const { lowStockItems, nearExpiryItems, isLoading: alertsLoading } = useStockAlerts();
  const { data: salesSummary, isLoading: salesLoading } = useSalesSummary(txApiFilters);

  // Mutations
  const deleteItemMutation = useDeleteInventoryItem();
  const deleteTxMutation = useDeleteTransaction();

  // Form states
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isMassDistributionOpen, setIsMassDistributionOpen] = useState(false);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isSalesDetailOpen, setIsSalesDetailOpen] = useState(false);
  const [selectedSalesItem, setSelectedSalesItem] = useState<{ name: string; id: string } | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any>(null);

  // Handlers
  const handleEditItem = useCallback((id: string) => {
    const item = (data as any)?.data?.find((d: any) => d.id === id);
    setEditingItem(item);
    setIsInventoryFormOpen(true);
  }, [data]);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!hasPermission("delete_item")) {
      alert("Anda tidak memiliki izin untuk menghapus item");
      return;
    }
    
    if (confirm("Apakah Anda yakin ingin menghapus item ini?")) {
      try {
        await deleteItemMutation.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  }, [deleteItemMutation, hasPermission]);

  const handleEditTransaction = useCallback((id: string) => {
    const transaction = (txData as any)?.data?.find((d: any) => d.id === id);
    setEditingTransaction(transaction);
    setIsTransactionFormOpen(true);
  }, [txData]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    if (!hasPermission("delete_transaction")) {
      alert("Anda tidak memiliki izin untuk menghapus transaksi");
      return;
    }
    
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      try {
        await deleteTxMutation.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
  }, [deleteTxMutation, hasPermission]);

  const handleStockAdjust = useCallback((id: string) => {
    if (!hasPermission("create_transaction")) {
      alert("Anda tidak memiliki izin untuk melakukan penyesuaian stok");
      return;
    }
    
    const item = (data as any)?.data?.find((d: any) => d.id === id);
    setSelectedItemForAdjust(item);
    setIsStockAdjustOpen(true);
  }, [data, hasPermission]);

  const handleCloseForms = useCallback(() => {
    setIsInventoryFormOpen(false);
    setIsTransactionFormOpen(false);
    setIsMassDistributionOpen(false);
    setIsStockAdjustOpen(false);
    setEditingItem(null);
    setEditingTransaction(null);
    setSelectedItemForAdjust(null);
  }, []);

  const handleBulkSelection = useCallback((selectedIds: string[]) => {
    setSelectedTransactionIds(selectedIds);
  }, []);

  const handleClearBulkSelection = useCallback(() => {
    setSelectedTransactionIds([]);
  }, []);

  const handleRefreshTransactions = useCallback(() => {
    // This will trigger a refetch of transactions
    window.location.reload();
  }, []);

  const handleSalesItemClick = useCallback((itemName: string, itemId: string) => {
    setSelectedSalesItem({ name: itemName, id: itemId });
    setIsSalesDetailOpen(true);
  }, []);

  const handleCloseSalesDetail = useCallback(() => {
    setIsSalesDetailOpen(false);
    setSelectedSalesItem(null);
  }, []);


  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const handleTxFiltersChange = useCallback((newFilters: Partial<typeof txFilters>) => {
    setTxFilters(prev => ({ ...prev, ...newFilters }));
    setTxPage(1);
  }, []);

  // Calculate stats
  const totalItems = (data as any)?.total || 0;
  const totalTransactions = (txData as any)?.total || 0;
  const totalValue = (data as any)?.data?.reduce((sum: number, item: any) => 
    sum + ((item.jumlah || 0) * (item.harga_perolehan || 0)), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="space-y-8 p-6">
        {/* Modern Stats Cards */}
        <ModernStatsCards 
          totalItems={totalItems}
          totalTransactions={totalTransactions}
          totalValue={totalValue}
          alertsCount={lowStockItems.length + nearExpiryItems.length}
          lowStockCount={lowStockItems.length}
          nearExpiryCount={nearExpiryItems.length}
          loading={isFetching || txLoading}
        />

        {/* Header with user info and actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    Selamat datang, <span className="font-medium text-gray-900">{user?.name || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      {user?.role?.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('id-ID', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {hasPermission("create_transaction") && (
                <Button 
                  onClick={() => setIsTransactionFormOpen(true)} 
                  className="bg-green-600 hover:bg-green-700 shadow-sm"
                >
                  + Tambah Transaksi
                </Button>
              )}
              {hasPermission("create_transaction") && (
                <Button 
                  onClick={() => setIsMassDistributionOpen(true)} 
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  📦 Distribusi Massal
                </Button>
              )}
              {hasPermission("create_item") && (
                <Button 
                  onClick={() => setIsInventoryFormOpen(true)} 
                  variant="outline"
                  className="shadow-sm"
                >
                  + Tambah Item
                </Button>
              )}
              {hasPermission("export_data") && (
                <ExportMenu 
                  data={activeTab === "transaksi" ? ((txData as any)?.data || []) : ((data as any)?.data || [])}
                  filters={activeTab === "transaksi" ? txFilters : filters}
                  type={activeTab === "transaksi" ? "transactions" : "inventory"}
                />
              )}
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input 
                value={activeTab === "transaksi" ? txFilters.search : filters.search}
                onChange={(e) => {
                  if (activeTab === "transaksi") {
                    handleTxFiltersChange({ search: e.target.value });
                  } else {
                    handleFiltersChange({ search: e.target.value });
                  }
                }}
                placeholder="Cari barang, kategori, atau lokasi..." 
                className="w-full" 
              />
            </div>
            <div className="text-sm text-gray-500">
              {activeTab === "transaksi" ? `${(txData as any)?.total || 0} transaksi` : `${(data as any)?.total || 0} item`}
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="transaksi" 
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                >
                  <div className="flex items-center gap-2 py-3">
                    <span>Transaksi</span>
                    {totalTransactions > 0 && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                        {totalTransactions}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="inventaris"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                >
                  <div className="flex items-center gap-2 py-3">
                    <span>Inventaris</span>
                    {totalItems > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                        {totalItems}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="alerts"
                  className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
                >
                  <div className="flex items-center gap-2 py-3">
                    <span>Alerts</span>
                    {(lowStockItems.length + nearExpiryItems.length) > 0 && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                        {lowStockItems.length + nearExpiryItems.length}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="penjualan"
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500"
                >
                  <div className="flex items-center gap-2 py-3">
                    <span>Penjualan</span>
                    {salesSummary && salesSummary.totalPenjualan > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
                        {formatRupiah(salesSummary.totalPenjualan)}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="laporan"
                  className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-500"
                >
                  <div className="flex items-center gap-2 py-3">
                    <span>Laporan</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

        <TabsContent value="transaksi" className="space-y-4">
          {/* Compact Filter Section */}
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipe Transaksi</label>
                  <Select 
                    value={txFilters.tipe} 
                    onValueChange={(value) => handleTxFiltersChange({ tipe: value as any })}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Pilih tipe transaksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="Masuk">📥 Masuk</SelectItem>
                      <SelectItem value="Keluar">📤 Keluar</SelectItem>
                      <SelectItem value="Stocktake">🔄 Stocktake</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Tanggal Mulai</label>
                  <Input
                    type="date"
                    value={txFilters.startDate}
                    onChange={(e) => handleTxFiltersChange({ startDate: e.target.value })}
                    className="w-full mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Tanggal Akhir</label>
                  <Input
                    type="date"
                    value={txFilters.endDate}
                    onChange={(e) => handleTxFiltersChange({ endDate: e.target.value })}
                    className="w-full mt-1"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTxFilters({ search: "", tipe: "all", startDate: "", endDate: "" })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
          
          {/* Bulk Actions */}
          <TransactionBulkActions
            selectedIds={selectedTransactionIds}
            onClearSelection={handleClearBulkSelection}
            onRefresh={handleRefreshTransactions}
          />
          
          {/* Table */}
          <div className="bg-white rounded-lg border shadow-sm">
            <TransactionTableWithBulk 
              rows={((txData as any)?.data || []) as any} 
              loading={txLoading}
              onEdit={hasPermission("edit_transaction") ? handleEditTransaction : undefined}
              onDelete={hasPermission("delete_transaction") ? handleDeleteTransaction : undefined}
              onBulkSelection={handleBulkSelection}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              disabled={txPage === 1} 
              onClick={() => setTxPage(p => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>Hal {txPage}</span>
            <Button 
              variant="outline" 
              disabled={((txData as any)?.total || 0) <= txPage * DEFAULT_PAGE_SIZE} 
              onClick={() => setTxPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="inventaris" className="space-y-4">
          <InventoryFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            tipeItem={filters.tipe_item}
          />
          
          <div className="p-6">
            <ModernInventoryTable 
              rows={((data as any)?.data || []) as any} 
              loading={isFetching}
              onEdit={hasPermission("edit_item") ? handleEditItem : undefined}
              onDelete={hasPermission("delete_item") ? handleDeleteItem : undefined}
              onStockAdjust={hasPermission("create_transaction") ? handleStockAdjust : undefined}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span>Hal {page}</span>
            <Button 
              variant="outline" 
              disabled={((data as any)?.total || 0) <= page * DEFAULT_PAGE_SIZE} 
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {/* Alerts Panel */}
              <div className="bg-white rounded-lg border shadow-sm">
                <ModernAlertsPanel 
                  lowStockItems={lowStockItems as any}
                  nearExpiryItems={nearExpiryItems as any}
                  loading={alertsLoading}
                  onRefresh={() => {
                    // Refresh alerts data
                    window.location.reload();
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="penjualan" className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ringkasan Penjualan</h3>
                    <p className="text-sm text-gray-500">Analisis pemasukan dari penjualan inventaris</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Terakhir diupdate: {new Date().toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
                
                <SalesSummaryPanel 
                  data={salesSummary} 
                  loading={salesLoading}
                  filters={{
                    startDate: txFilters.startDate,
                    endDate: txFilters.endDate
                  }}
                  onItemClick={handleSalesItemClick}
                />
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

        {/* Forms */}
        <InventoryForm 
          isOpen={isInventoryFormOpen}
          onClose={handleCloseForms}
          editingItem={editingItem}
        />
        
        <TransactionForm 
          isOpen={isTransactionFormOpen}
          onClose={handleCloseForms}
          editingTransaction={editingTransaction}
        />
        
        <MassDistributionForm
          isOpen={isMassDistributionOpen}
          onClose={handleCloseForms}
        />

        <SalesDetailModal
          isOpen={isSalesDetailOpen}
          onClose={handleCloseSalesDetail}
          itemName={selectedSalesItem?.name || ""}
          itemId={selectedSalesItem?.id || ""}
        />
        
        <StockAdjustDialog 
          isOpen={isStockAdjustOpen}
          onClose={handleCloseForms}
          item={selectedItemForAdjust}
        />
      </div>
    </div>
  );
};

export default InventarisV2;


