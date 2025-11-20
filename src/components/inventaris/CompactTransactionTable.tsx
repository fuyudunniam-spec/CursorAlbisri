import { memo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  Package
} from "lucide-react";
import { formatRupiah, formatDate } from "@/utils/inventaris.utils";

type TransactionRow = {
  id: string;
  item_id: string;
  tipe: "Masuk" | "Keluar" | "Stocktake";
  jumlah?: number | null;
  harga_satuan?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  penerima?: string | null;
  tanggal: string;
  catatan?: string | null;
  created_at?: string | null;
  nama_barang?: string;
};

type Props = {
  rows: TransactionRow[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
};

const CompactTransactionTable = memo(({ 
  rows, 
  loading, 
  onEdit, 
  onDelete,
  onView 
}: Props) => {
  const getTipeIcon = (tipe: string) => {
    switch (tipe) {
      case "Masuk":
        return <ArrowUp className="h-3 w-3 text-green-600" />;
      case "Keluar":
        return <ArrowDown className="h-3 w-3 text-red-600" />;
      case "Stocktake":
        return <RotateCcw className="h-3 w-3 text-blue-600" />;
      default:
        return <Package className="h-3 w-3 text-gray-600" />;
    }
  };

  const getTipeColor = (tipe: string) => {
    switch (tipe) {
      case "Masuk":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "Keluar":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "Stocktake":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getStockChange = (row: TransactionRow) => {
    if (row.tipe === "Stocktake") {
      return `${row.before_qty || 0} → ${row.after_qty || 0}`;
    }
    const change = row.tipe === "Masuk" ? "+" : "-";
    return `${change}${row.jumlah || 0}`;
  };

  if (loading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada transaksi</h3>
        <p className="text-gray-500">Mulai dengan menambahkan transaksi pertama Anda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-[100px]">Tanggal</TableHead>
                <TableHead className="min-w-[180px]">Item</TableHead>
                <TableHead className="w-[80px]">Tipe</TableHead>
                <TableHead className="w-[80px] text-right">Jumlah</TableHead>
                <TableHead className="w-[100px] text-right">Harga</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                <TableHead className="w-[100px]">Penerima</TableHead>
                <TableHead className="w-[80px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const totalValue = (row.jumlah || 0) * (row.harga_satuan || 0);
                const stockChange = getStockChange(row);
                
                return (
                  <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="w-[100px]">
                      <div className="text-xs">
                        {formatDate(row.tanggal)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-gray-900 truncate" title={row.nama_barang || "Item tidak ditemukan"}>
                          {row.nama_barang || "Item tidak ditemukan"}
                        </div>
                        {row.catatan && (
                          <div className="text-xs text-gray-500 truncate" title={row.catatan}>
                            {row.catatan}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[80px]">
                      <div className="flex items-center space-x-1">
                        {getTipeIcon(row.tipe)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getTipeColor(row.tipe)}`}
                        >
                          {row.tipe}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="w-[80px] text-right">
                      <div className="text-xs font-medium">
                        {row.tipe === "Stocktake" ? (
                          <span className="text-blue-600">{stockChange}</span>
                        ) : (
                          <span className={row.tipe === "Masuk" ? "text-green-600" : "text-red-600"}>
                            {stockChange}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px] text-right">
                      <div className="text-xs">
                        {row.harga_satuan ? formatRupiah(row.harga_satuan) : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px] text-right">
                      <div className="font-medium text-xs">
                        {totalValue > 0 ? formatRupiah(totalValue) : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px]">
                      {row.penerima ? (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-xs truncate" title={row.penerima}>
                            {row.penerima}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="w-[80px] text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(row.id)}>
                              <Eye className="h-3 w-3 mr-2" />
                              Lihat Detail
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(row.id)}>
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(row.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {rows.map((row) => {
          const totalValue = (row.jumlah || 0) * (row.harga_satuan || 0);
          const stockChange = getStockChange(row);
          
          return (
            <div key={row.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getTipeIcon(row.tipe)}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getTipeColor(row.tipe)}`}
                    >
                      {row.tipe}
                    </Badge>
                    <span className="text-xs text-gray-500">{formatDate(row.tanggal)}</span>
                  </div>
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {row.nama_barang || "Item tidak ditemukan"}
                  </div>
                  {row.catatan && (
                    <div className="text-xs text-gray-500 mb-2">
                      {row.catatan}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(row.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Lihat Detail
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(row.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(row.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Jumlah:</span>
                  <div className="font-medium">
                    {row.tipe === "Stocktake" ? (
                      <span className="text-blue-600">{stockChange}</span>
                    ) : (
                      <span className={row.tipe === "Masuk" ? "text-green-600" : "text-red-600"}>
                        {stockChange}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Harga:</span>
                  <div className="font-medium">
                    {row.harga_satuan ? formatRupiah(row.harga_satuan) : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <div className="font-medium">
                    {totalValue > 0 ? formatRupiah(totalValue) : "-"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Penerima:</span>
                  <div className="font-medium truncate">
                    {row.penerima ? (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>{row.penerima}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CompactTransactionTable.displayName = "CompactTransactionTable";

export default CompactTransactionTable;
