import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Filter,
  X,
  DollarSign,
  Store,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InventoryItem, Pagination, Sort } from '@/types/inventaris.types';
import { updateInventoryItem } from '@/services/inventaris.service';
import { useToast } from '@/hooks/use-toast';
import ItemForm from './ItemForm';
import KeluarItemDialog from './KeluarItemDialog';

interface ItemListProps {
  data?: InventoryItem[];
  isLoading?: boolean;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onAdd?: () => void;
  pagination?: Pagination;
  onPaginationChange?: (pagination: Pagination) => void;
  sort?: Sort;
  onSortChange?: (sort: Sort) => void;
}

const ItemList: React.FC<ItemListProps> = ({
  data = [],
  isLoading = false,
  onEdit = () => {},
  onDelete,
  onAdd,
  pagination = { page: 1, pageSize: 10 },
  onPaginationChange = () => {},
  sort = { column: 'nama_barang', direction: 'asc' },
  onSortChange = () => {},
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showKeluarDialog, setShowKeluarDialog] = useState(false);
  const [itemToKeluar, setItemToKeluar] = useState<InventoryItem | undefined>(undefined);
  const [filters, setFilters] = useState({
    search: '',
    kategori: 'all',
    tipe: 'all',
    kondisi: 'all',
    status: 'all'
  });
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatQuantity = (jumlah: number | null | undefined): string => {
    const qty = jumlah || 0;
    if (qty === 0) return 'Habis';
    if (qty < 10) return qty.toString(); // Single digit, no leading zero
    return qty.toString();
  };

  const handleToggleBolehJual = async (item: InventoryItem) => {
    if (item.tipe_item !== 'Komoditas') {
      toast({
        title: 'Tidak bisa diizinkan',
        description: 'Hanya item bertipe Komoditas yang bisa dijual di koperasi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdatingId(item.id);
      const next = !item.boleh_dijual_koperasi;

      await updateInventoryItem(item.id, { boleh_dijual_koperasi: next });

      toast({
        title: next ? 'Pengajuan dibuat' : 'Dihapus dari kasir',
        description: next
          ? 'Item akan masuk ke pengajuan. Setelah disetujui admin koperasi, item akan muncul di Master Produk Koperasi.'
          : 'Item tidak akan muncul lagi di kasir koperasi.',
      });

      // Minta parent refresh data (InventarisMasterPage memetakan onAdd ke fetchInventoryData)
      if (onAdd) onAdd();
    } catch (error) {
      console.error('Error toggling boleh_dijual_koperasi:', error);
      toast({
        title: 'Gagal mengubah status jual',
        description: 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Get unique values for filters
  const uniqueKategori = Array.from(new Set(data.map(item => item.kategori).filter(Boolean)));
  const uniqueTipe = Array.from(new Set(data.map(item => item.tipe_item).filter(Boolean)));
  const uniqueKondisi = ['Baik', 'Perlu perbaikan', 'Rusak'];

  // Apply filters
  const filteredData = data.filter(item => {
    // Search filter
    if (filters.search && !item.nama_barang.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Kategori filter
    if (filters.kategori !== 'all' && item.kategori !== filters.kategori) {
      return false;
    }
    // Tipe filter
    if (filters.tipe !== 'all' && item.tipe_item !== filters.tipe) {
      return false;
    }
    // Kondisi filter
    if (filters.kondisi !== 'all' && item.kondisi !== filters.kondisi) {
      return false;
    }
    // Status filter
    if (filters.status !== 'all') {
      const jumlah = item.jumlah || 0;
      const minStock = item.min_stock || 10;
      if (filters.status === 'habis' && jumlah !== 0) return false;
      if (filters.status === 'rendah' && (jumlah === 0 || jumlah > minStock)) return false;
      if (filters.status === 'normal' && jumlah <= minStock) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      kategori: 'all',
      tipe: 'all',
      kondisi: 'all',
      status: 'all'
    });
  };

  const hasActiveFilters = filters.search || filters.kategori !== 'all' || 
    filters.tipe !== 'all' || filters.kondisi !== 'all' || filters.status !== 'all';

  const getKondisiBadge = (kondisi: string) => {
    const variants = {
      'Baik': 'default',
      'Perlu perbaikan': 'secondary',
      'Rusak': 'destructive'
    } as const;

    return (
      <Badge variant={variants[kondisi as keyof typeof variants] || 'default'}>
        {kondisi}
      </Badge>
    );
  };

  const getTipeBadge = (tipe: string) => {
    return (
      <Badge variant={tipe === 'Aset' ? 'default' : 'outline'}>
        {tipe}
      </Badge>
    );
  };

  const getStockStatus = (jumlah: number, minStock: number) => {
    if (jumlah === 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Habis</Badge>;
    }
    if (jumlah <= minStock) {
      return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Rendah</Badge>;
    }
    return <Badge variant="default">Normal</Badge>;
  };

  const handleSort = (column: string) => {
    const newDirection = sort?.column === column && sort?.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction: newDirection });
  };

  const handlePageChange = (newPage: number) => {
    onPaginationChange({ ...pagination, page: newPage });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <>
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Package className="h-5 w-5 text-gray-600" />
              Daftar Items
              <Badge variant="secondary" className="ml-1">0</Badge>
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingItem(undefined);
                setShowItemForm(true);
              }}
              className="gap-2 h-8"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Item</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4 opacity-50" />
              <p className="text-gray-600 font-medium">Belum ada data barang</p>
              <p className="text-sm text-gray-500 mt-2">Tambahkan barang baru untuk memulai</p>
              <Button 
                onClick={() => {
                  setEditingItem(undefined);
                  setShowItemForm(true);
                }}
                className="mt-4 gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Tambah Item Pertama
              </Button>
            </div>
          </CardContent>
        </Card>
        {showItemForm && (
          <ItemForm
            onClose={() => {
              setShowItemForm(false);
              setEditingItem(undefined);
              if (onAdd) onAdd();
            }}
            editItem={editingItem}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Package className="h-5 w-5 text-gray-600" />
              <span className="hidden sm:inline">Daftar Items</span>
              <span className="sm:hidden">Items</span>
              <Badge variant="secondary" className="ml-1">{filteredData.length}</Badge>
              {hasActiveFilters && data.length !== filteredData.length && (
                <span className="text-xs text-gray-500">dari {data.length}</span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2 h-8"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  setEditingItem(undefined);
                  setShowItemForm(true);
                }}
                className="gap-2 h-8"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah Item</span>
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Search */}
                <div className="lg:col-span-3">
                  <Input
                    placeholder="Cari nama barang..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="h-9"
                  />
                </div>

                {/* Kategori */}
                <Select value={filters.kategori} onValueChange={(value) => setFilters({ ...filters, kategori: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {uniqueKategori.map(kat => (
                      <SelectItem key={kat} value={kat}>{kat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Tipe */}
                <Select value={filters.tipe} onValueChange={(value) => setFilters({ ...filters, tipe: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    {uniqueTipe.map(tipe => (
                      <SelectItem key={tipe} value={tipe}>{tipe}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Kondisi */}
                <Select value={filters.kondisi} onValueChange={(value) => setFilters({ ...filters, kondisi: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua Kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kondisi</SelectItem>
                    {uniqueKondisi.map(kondisi => (
                      <SelectItem key={kondisi} value={kondisi}>{kondisi}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Stok */}
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="habis">Habis</SelectItem>
                    <SelectItem value="rendah">Stok Rendah</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="gap-2 h-8 text-gray-600"
                  >
                    <X className="h-4 w-4" />
                    Hapus Filter
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
        {/* Desktop Table View - Compact & Elegant */}
        <div className="hidden md:block border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 font-semibold text-xs uppercase tracking-wide text-gray-600"
                  onClick={() => handleSort('nama_barang')}
                >
                  <div className="flex items-center gap-1">
                    Nama Barang
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Tipe</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Owner</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Kategori</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Lokasi</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Kondisi</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 font-semibold text-xs uppercase tracking-wide text-gray-600"
                  onClick={() => handleSort('jumlah')}
                >
                  <div className="flex items-center gap-1">
                    Stok
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Harga</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-600">Expiry</TableHead>
                <TableHead className="text-right font-semibold text-xs uppercase tracking-wide text-gray-600">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={`
                    hover:bg-gray-50/80 transition-colors
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                  `}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>{item.nama_barang}</span>
                        {/* Icon status koperasi (klik untuk toggle izin jual) */}
                        {item.tipe_item === 'Komoditas' && (
                          <button
                            type="button"
                            onClick={() => handleToggleBolehJual(item)}
                            disabled={updatingId === item.id}
                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border border-transparent hover:border-emerald-200 hover:bg-emerald-50/60 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            title={
                              item.boleh_dijual_koperasi
                                ? 'Klik untuk menonaktifkan penjualan di koperasi'
                                : 'Klik untuk mengizinkan penjualan di koperasi'
                            }
                          >
                            <Store
                              className={
                                item.boleh_dijual_koperasi
                                  ? 'w-3.5 h-3.5 text-emerald-600'
                                  : 'w-3.5 h-3.5 text-gray-300'
                              }
                            />
                            <span className="hidden sm:inline">
                              {item.boleh_dijual_koperasi ? 'Dijual' : 'Tidak dijual'}
                            </span>
                          </button>
                        )}
                      </div>
                      {item.kode_inventaris && (
                        <span className="mt-0.5 text-[10px] font-mono text-gray-400">
                          {item.kode_inventaris}
                        </span>
                      )}
                      {item.sumber && (
                        <span className="mt-0.5 text-[11px] text-gray-500">
                          {item.sumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTipeBadge(item.tipe_item)}</TableCell>
                  <TableCell>
                    <Badge variant={item.owner_type === 'koperasi' ? 'default' : 'outline'} className="text-xs">
                      {item.owner_type === 'koperasi' ? 'Koperasi' : 'Yayasan'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{item.kategori}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{item.zona}</span>
                      {item.lokasi && (
                        <span className="text-xs text-gray-500 truncate max-w-[180px]">
                          {item.lokasi}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getKondisiBadge(item.kondisi)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-gray-900">
                      {formatQuantity(item.jumlah)} {item.jumlah !== 0 && item.satuan}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStockStatus(item.jumlah || 0, item.min_stock || 10)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                    {item.harga_perolehan ? formatRupiah(item.harga_perolehan) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.has_expiry && item.tanggal_kedaluwarsa ? (
                      (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const expiry = new Date(item.tanggal_kedaluwarsa);
                        expiry.setHours(0, 0, 0, 0);
                        const diffTime = expiry.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        const dateLabel = expiry.toLocaleDateString('id-ID');

                        if (diffDays < 0) {
                          return (
                            <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5">
                              <Clock className="h-3 w-3 text-red-500" />
                              <span className="text-[11px] font-medium text-red-600">
                                Kadaluarsa
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-700">{dateLabel}</span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Icon Pengeluaran - hanya untuk item dengan stock > 0 */}
                      {item.jumlah && item.jumlah > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setItemToKeluar(item);
                            setShowKeluarDialog(true);
                          }}
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Pengeluaran Item"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingItem(item);
                          setShowItemForm(true);
                        }}
                        className="h-7 text-xs text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(item)}
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View - Compact */}
        <div className="md:hidden space-y-3">
          {filteredData.map((item) => (
            <Card key={item.id} className="overflow-hidden border border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2.5">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-900">{item.nama_barang}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {item.kode_inventaris && (
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.kode_inventaris}
                        </span>
                      )}
                      {item.is_komoditas && (
                        <Badge variant="outline" className="text-xs">Komoditas</Badge>
                      )}
                      {item.boleh_dijual_koperasi && (
                        <Badge variant="default" className="text-xs">Boleh Dijual</Badge>
                      )}
                      {item.owner_type && (
                        <Badge variant={item.owner_type === 'koperasi' ? 'default' : 'outline'} className="text-xs">
                          {item.owner_type === 'koperasi' ? 'Koperasi' : 'Yayasan'}
                        </Badge>
                      )}
                      {item.sumber && (
                        <span className="text-xs text-gray-500">
                          {item.sumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {/* Icon Pengeluaran - hanya untuk item dengan stock > 0 */}
                    {item.jumlah && item.jumlah > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setItemToKeluar(item);
                          setShowKeluarDialog(true);
                        }}
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Pengeluaran Item"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingItem(item);
                        setShowItemForm(true);
                      }}
                      className="h-7 w-7 p-0 text-gray-600"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(item)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Tipe:</span>
                    <div className="mt-0.5">{getTipeBadge(item.tipe_item)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Kategori:</span>
                    <div className="mt-0.5 font-medium text-gray-900">{item.kategori}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Lokasi:</span>
                    <div className="mt-0.5">
                      <div className="font-medium text-gray-900">{item.zona}</div>
                      <div className="text-xs text-gray-500">{item.lokasi}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Kondisi:</span>
                    <div className="mt-0.5">{getKondisiBadge(item.kondisi)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Stok:</span>
                    <div className="mt-0.5 font-medium text-gray-900">
                      {formatQuantity(item.jumlah)} {item.jumlah !== 0 && item.satuan}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="mt-0.5">
                      {getStockStatus(item.jumlah || 0, item.min_stock || 10)}
                    </div>
                  </div>
                  {item.harga_perolehan && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Harga:</span>
                      <div className="mt-0.5 font-medium text-gray-900">{formatRupiah(item.harga_perolehan)}</div>
                    </div>
                  )}
                  {item.has_expiry && item.tanggal_kedaluwarsa && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Kedaluwarsa:</span>
                      <div className="mt-0.5 flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">
                            {new Date(item.tanggal_kedaluwarsa).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const expiry = new Date(item.tanggal_kedaluwarsa);
                          expiry.setHours(0, 0, 0, 0);
                          const diffTime = expiry.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays < 0) {
                            return (
                              <Badge variant="destructive" className="text-xs w-fit">
                                Kadaluarsa ({Math.abs(diffDays)} hari lalu)
                              </Badge>
                            );
                          } else if (diffDays <= 7) {
                            return (
                              <Badge variant="destructive" className="text-xs w-fit">
                                {diffDays} hari lagi
                              </Badge>
                            );
                          } else if (diffDays <= 30) {
                            return (
                              <Badge variant="secondary" className="text-xs w-fit">
                                {diffDays} hari lagi
                              </Badge>
                            );
                          } else {
                            return (
                              <span className="text-xs text-muted-foreground">
                                {diffDays} hari lagi
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4 opacity-50" />
            <p className="text-gray-600 font-medium">Tidak ada data yang sesuai</p>
            {hasActiveFilters && (
              <Button 
                onClick={clearFilters}
                className="mt-4 gap-2"
                variant="outline"
              >
                <X className="h-4 w-4" />
                Hapus Filter
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Menampilkan {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, filteredData.length)} dari {filteredData.length} item
              {hasActiveFilters && data.length !== filteredData.length && (
                <span className="text-gray-400"> (difilter dari {data.length})</span>
              )}
            </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {pagination.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={filteredData.length < pagination.pageSize}
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        )}
      </CardContent>
    </Card>

    {/* Keluar Item Dialog */}
    <KeluarItemDialog
      open={showKeluarDialog}
      onClose={() => {
        setShowKeluarDialog(false);
        setItemToKeluar(undefined);
      }}
      item={itemToKeluar || null}
      onSuccess={() => {
        if (onAdd) onAdd();
      }}
    />

    {/* Item Form Modal */}
    {showItemForm && (
      <ItemForm
        onClose={() => {
          setShowItemForm(false);
          setEditingItem(undefined);
          if (onAdd) onAdd();
        }}
        editItem={editingItem}
      />
    )}
  </>
  );
};

export default ItemList;
