import { memo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatDate } from "@/utils/inventaris.utils";
import { Edit, Trash2 } from "lucide-react";

type TransactionRow = {
  id: string;
  item_id: string;
  tipe: "Masuk" | "Keluar" | "Stocktake";
  jumlah?: number | null;
  harga_satuan?: number | null;
  harga_total?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  penerima?: string | null;
  tanggal: string;
  catatan?: string | null;
  created_at?: string | null;
  // Joined data
  nama_barang?: string;
  kategori?: string;
  satuan?: string;
  // New fields for mass distribution
  penerima_santri_id?: string | null;
  kategori_barang?: string | null;
  nama_barang_dist?: string | null;
  satuan_dist?: string | null;
  keluar_mode?: string | null;
};

type Props = {
  rows: TransactionRow[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBulkSelection?: (selectedIds: string[]) => void;
};

const TransactionTableWithBulk = memo(({ 
  rows, 
  loading, 
  onEdit, 
  onDelete, 
  onBulkSelection 
}: Props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = rows.map(row => row.id);
      setSelectedIds(allIds);
      onBulkSelection?.(allIds);
    } else {
      setSelectedIds([]);
      onBulkSelection?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedIds, id];
      setSelectedIds(newSelected);
      onBulkSelection?.(newSelected);
    } else {
      const newSelected = selectedIds.filter(selectedId => selectedId !== id);
      setSelectedIds(newSelected);
      onBulkSelection?.(newSelected);
    }
  };

  const getTipeColor = (tipe: string) => {
    switch (tipe) {
      case "Masuk":
        return "bg-green-100 text-green-800";
      case "Keluar":
        return "bg-red-100 text-red-800";
      case "Stocktake":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTipeIcon = (tipe: string) => {
    switch (tipe) {
      case "Masuk":
        return "↗️";
      case "Keluar":
        return "↘️";
      case "Stocktake":
        return "📊";
      default:
        return "❓";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Tidak ada transaksi ditemukan</p>
      </div>
    );
  }

  const allSelected = selectedIds.length === rows.length && rows.length > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < rows.length;

  return (
    <div className="space-y-2">
      {/* Header with Select All */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm font-medium text-gray-700">
          {selectedIds.length > 0 ? `${selectedIds.length} dipilih` : 'Pilih Semua'}
        </span>
      </div>

      {/* Transaction Rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
              selectedIds.includes(row.id) 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Checkbox
              checked={selectedIds.includes(row.id)}
              onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
            />
            
            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
              {/* Tanggal */}
              <div className="col-span-2">
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(row.tanggal)}
                </div>
                <div className="text-xs text-gray-500">
                  {row.created_at ? formatDate(row.created_at) : ''}
                </div>
              </div>

              {/* Item & Tipe */}
              <div className="col-span-3">
                <div className="text-sm font-medium text-gray-900">
                  {row.nama_barang || row.nama_barang_dist || 'Item tidak ditemukan'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">{getTipeIcon(row.tipe)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getTipeColor(row.tipe)}`}>
                    {row.tipe}
                  </span>
                  {row.keluar_mode && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                      {row.keluar_mode}
                    </span>
                  )}
                </div>
              </div>

              {/* Jumlah */}
              <div className="col-span-2 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {row.jumlah || 0} {row.satuan || row.satuan_dist || 'pcs'}
                </div>
                {row.before_qty !== null && row.after_qty !== null && (
                  <div className="text-xs text-gray-500">
                    {row.before_qty} → {row.after_qty}
                  </div>
                )}
              </div>

              {/* Harga */}
              <div className="col-span-2 text-right">
                {row.harga_satuan && (
                  <div className="text-sm font-medium text-gray-900">
                    {formatRupiah(row.harga_satuan)}
                  </div>
                )}
                {row.harga_total && (
                  <div className="text-xs text-gray-500">
                    Total: {formatRupiah(row.harga_total)}
                  </div>
                )}
              </div>

              {/* Penerima */}
              <div className="col-span-2">
                <div className="text-sm text-gray-900">
                  {row.penerima || '-'}
                </div>
                {row.kategori_barang && (
                  <div className="text-xs text-gray-500">
                    {row.kategori_barang}
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div className="col-span-1">
                {row.catatan && (
                  <div className="text-xs text-gray-500 truncate" title={row.catatan}>
                    {row.catatan}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(row.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(row.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

TransactionTableWithBulk.displayName = "TransactionTableWithBulk";

export default TransactionTableWithBulk;
