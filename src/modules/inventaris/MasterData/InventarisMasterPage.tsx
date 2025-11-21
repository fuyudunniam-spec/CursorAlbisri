import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ModuleHeader from '@/components/ModuleHeader';
import ItemList from './components/ItemList';
import StockOpname from './components/StockOpname';
import StockExpiryTable from './components/StockExpiryTable';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import { Package, ClipboardList, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { getLowStock, getNearExpiry, listInventory, deleteInventoryItem } from '@/services/inventaris.service';
import { InventoryItem } from '@/types/inventaris.types';
import { useToast } from '@/hooks/use-toast';

const InventarisMasterPage = () => {
    const [activeTab, setActiveTab] = useState('items');
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);
    const [expiredItems, setExpiredItems] = useState<any[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
    const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
    const [totalItems, setTotalItems] = useState(0);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (activeTab === 'items') {
            fetchInventoryData();
        } else if (activeTab === 'expiry') {
            fetchAlertData();
        }
    }, [activeTab, pagination.page]);

    const fetchInventoryData = async () => {
        setIsLoadingInventory(true);
        try {
            const result = await listInventory(pagination, {});
            // Type assertion untuk kompatibilitas
            setInventoryData((result.data || []) as InventoryItem[]);
            setTotalItems(result.total || 0);
        } catch (error) {
            console.error('Error fetching inventory data:', error);
            toast({
                title: 'Error',
                description: 'Gagal memuat data inventaris',
                variant: 'destructive'
            });
            setInventoryData([]);
        } finally {
            setIsLoadingInventory(false);
        }
    };

    const fetchAlertData = async () => {
        setIsLoadingAlerts(true);
        try {
            const [lowStock, expired] = await Promise.all([
                getLowStock(10),
                getNearExpiry(30)
            ]);

            setLowStockItems(lowStock || []);
            setExpiredItems(expired || []);
        } catch (error) {
            console.error('Error fetching alert data:', error);
            toast({
                title: 'Error',
                description: 'Gagal memuat data peringatan',
                variant: 'destructive'
            });
            setLowStockItems([]);
            setExpiredItems([]);
        } finally {
            setIsLoadingAlerts(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await deleteInventoryItem(itemToDelete.id);
            
            toast({
                title: 'Berhasil',
                description: `Item "${itemToDelete.nama_barang}" berhasil dihapus`,
            });

            // Refresh data
            fetchInventoryData();
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting item:', error);
            toast({
                title: 'Error',
                description: 'Gagal menghapus item. Silakan coba lagi.',
                variant: 'destructive'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRefresh = () => {
        if (activeTab === 'items') {
            fetchInventoryData();
        } else if (activeTab === 'expiry') {
            fetchAlertData();
        }
    };

    const tabs = [
        { label: 'Dashboard', path: '/inventaris' },
        { label: 'Master Data', path: '/inventaris/master' },
        { label: 'Penjualan', path: '/inventaris/sales' },
        { label: 'Distribusi', path: '/inventaris/distribution' }
    ];

    return (
        <div className="space-y-6">
            <ModuleHeader title="Master Data Inventaris" tabs={tabs} />

            <Tabs defaultValue="items" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="items" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Data Barang</span>
                        <span className="sm:hidden text-xs">Data</span>
                    </TabsTrigger>
                    <TabsTrigger value="stock-opname" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Stok Opname</span>
                        <span className="sm:hidden text-xs">Opname</span>
                    </TabsTrigger>
                    <TabsTrigger value="expiry" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="hidden sm:inline">Kedaluwarsa</span>
                        <span className="sm:hidden text-xs">Expiry</span>
                    </TabsTrigger>
                    <TabsTrigger value="import-export" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="hidden sm:inline">Import/Export</span>
                        <span className="sm:hidden text-xs">I/E</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-6">
                    <ItemList 
                        data={inventoryData}
                        isLoading={isLoadingInventory}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        onAdd={() => {
                            fetchInventoryData();
                        }}
                        onEdit={(item) => {
                            toast({
                                title: 'Edit Item',
                                description: `Fitur edit untuk ${item.nama_barang} sedang dalam pengembangan`
                            });
                        }}
                        onDelete={(item) => {
                            setItemToDelete(item);
                        }}
                    />
                </TabsContent>

                <TabsContent value="stock-opname" className="mt-6">
                    <StockOpname />
                </TabsContent>

                <TabsContent value="expiry" className="mt-6">
                    <StockExpiryTable 
                        lowStockItems={lowStockItems}
                        expiredItems={expiredItems}
                        isLoading={isLoadingAlerts}
                    />
                </TabsContent>

                <TabsContent value="import-export" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import/Export Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Fitur import/export sedang dalam pengembangan.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            {itemToDelete && (
                <DeleteConfirmDialog
                    item={itemToDelete}
                    isOpen={!!itemToDelete}
                    isDeleting={isDeleting}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={handleDeleteItem}
                />
            )}
        </div>
    );
};

export default InventarisMasterPage;
