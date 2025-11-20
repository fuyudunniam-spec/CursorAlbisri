import { memo, useState } from "react";
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
  TrendingUp, 
  Eye,
  Package,
  MapPin,
  Calendar
} from "lucide-react";
import { formatRupiah, getKondisiColor, isStockLow, isOutOfStock } from "@/utils/inventaris.utils";

type Row = {
  id: string;
  nama_barang: string;
  kategori: string;
  kondisi: string;
  jumlah?: number | null;
  satuan?: string | null;
  harga_perolehan?: number | null;
  zona?: string | null;
  lokasi?: string | null;
  min_stock?: number | null;
  created_at?: string | null;
};

type Props = {
  rows: Row[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStockAdjust?: (id: string) => void;
  onView?: (id: string) => void;
};

const ModernInventoryTable = memo(({ 
  rows, 
  loading, 
  onEdit, 
  onDelete, 
  onStockAdjust,
  onView 
}: Props) => {
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStockStatus = (jumlah: number | null, minStock: number | null) => {
    if (isOutOfStock(jumlah)) return { status: "Habis", color: "destructive" };
    if (isStockLow(jumlah, minStock)) return { status: "Rendah", color: "secondary" };
    return { status: "Normal", color: "default" };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data inventaris</h3>
        <p className="text-gray-500">Mulai dengan menambahkan item inventaris pertama Anda</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("nama_barang")}
            >
              <div className="flex items-center space-x-2">
                <span>Barang</span>
                {sortField === "nama_barang" && (
                  <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("kategori")}
            >
              <div className="flex items-center space-x-2">
                <span>Kategori</span>
                {sortField === "kategori" && (
                  <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </div>
            </TableHead>
            <TableHead>Kondisi</TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort("jumlah")}
            >
              <div className="flex items-center justify-end space-x-2">
                <span>Stok</span>
                {sortField === "jumlah" && (
                  <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </div>
            </TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Lokasi</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const stockStatus = getStockStatus(row.jumlah, row.min_stock);
            const totalValue = (row.jumlah || 0) * (row.harga_perolehan || 0);
            
            return (
              <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">{row.nama_barang}</div>
                    <div className="text-xs text-gray-500">ID: {row.id.slice(0, 8)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {row.kategori}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getKondisiColor(row.kondisi)}`}
                  >
                    {row.kondisi}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {row.jumlah || 0} {row.satuan || ""}
                    </div>
                    <Badge variant={stockStatus.color as any} className="text-xs">
                      {stockStatus.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="space-y-1">
                    <div className="font-medium">{formatRupiah(totalValue)}</div>
                    <div className="text-xs text-gray-500">
                      {formatRupiah(row.harga_perolehan || 0)}/unit
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{row.zona}</span>
                    <span>•</span>
                    <span>{row.lokasi}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
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
                      {onStockAdjust && (
                        <DropdownMenuItem onClick={() => onStockAdjust(row.id)}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Adjust Stok
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

ModernInventoryTable.displayName = "ModernInventoryTable";

export default ModernInventoryTable;
