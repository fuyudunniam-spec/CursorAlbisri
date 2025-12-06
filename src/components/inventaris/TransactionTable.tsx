import { memo } from "react";
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
  // Joined data
  nama_barang?: string;
};

type Props = {
  rows: TransactionRow[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const TransactionTable = memo(({ rows, loading, onEdit, onDelete }: Props) => {
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

  return (
    <div className="w-full overflow-auto border rounded-lg">
      <table className="min-w-[1000px] w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr>
            <th className="px-3 py-2 text-left">Tanggal</th>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-left">Tipe</th>
            <th className="px-3 py-2 text-right">Jumlah</th>
            <th className="px-3 py-2 text-left">Tujuan</th>
            <th className="px-3 py-2 text-left">Catatan</th>
            <th className="px-3 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="px-3 py-6" colSpan={7}>Memuat...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td className="px-3 py-6" colSpan={7}>Tidak ada data transaksi</td></tr>
          ) : (
            rows.map((row) => {
              const stockChange = row.tipe === "Stocktake" ? 
                `${row.before_qty || 0} → ${row.after_qty || 0}` : 
                `${row.tipe === "Masuk" ? "+" : "-"}${row.jumlah || 0}`;

              return (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{formatDate(row.tanggal)}</td>
                  <td className="px-3 py-2 font-medium">{row.nama_barang || "Item tidak ditemukan"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border ${getTipeColor(row.tipe)}`}>
                      {row.tipe}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.tipe === "Stocktake" ? (
                      <span className="text-blue-600">{stockChange}</span>
                    ) : (
                      <span className={row.tipe === "Masuk" ? "text-green-600" : "text-red-600"}>
                        {stockChange}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.penerima || (row.tipe === "Masuk" ? "Pembelian" : "-")}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={row.catatan || ""}>
                    {row.catatan || "-"}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {onEdit && (
                      <button 
                        className="text-blue-600 hover:underline text-xs"
                        onClick={() => onEdit(row.id)}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        className="text-red-600 hover:underline text-xs"
                        onClick={() => onDelete(row.id)}
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
});

TransactionTable.displayName = "TransactionTable";

export default TransactionTable;
