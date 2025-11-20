import { memo } from "react";
import { formatRupiah, getKondisiColor } from "@/utils/inventaris.utils";

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
};

type Props = {
  rows: Row[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStockAdjust?: (id: string) => void;
};

const InventoryTable = memo(({ rows, loading, onEdit, onDelete, onStockAdjust }: Props) => {
  return (
    <div className="w-full overflow-auto border rounded-lg">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="sticky top-0 bg-white border-b">
          <tr>
            <th className="px-3 py-2 text-left">Barang</th>
            <th className="px-3 py-2 text-left">Kategori</th>
            <th className="px-3 py-2 text-left">Kondisi</th>
            <th className="px-3 py-2 text-right">Jumlah</th>
            <th className="px-3 py-2 text-right">Nilai</th>
            <th className="px-3 py-2 text-left">Lokasi</th>
            <th className="px-3 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="px-3 py-6" colSpan={7}>Memuat...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td className="px-3 py-6" colSpan={7}>Tidak ada data</td></tr>
          ) : (
            rows.map(r => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{r.nama_barang}</td>
                <td className="px-3 py-2">{r.kategori}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border ${getKondisiColor(r.kondisi)}`}>
                    {r.kondisi}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{r.jumlah ?? 0} {r.satuan || ""}</td>
                <td className="px-3 py-2 text-right">{formatRupiah((r.harga_perolehan || 0) * (r.jumlah || 0))}</td>
                <td className="px-3 py-2">{[r.zona, r.lokasi].filter(Boolean).join(" · ")}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  {onEdit && <button className="text-blue-600 hover:underline" onClick={() => onEdit(r.id)}>Edit</button>}
                  {onStockAdjust && <button className="text-green-600 hover:underline" onClick={() => onStockAdjust(r.id)}>Adjust</button>}
                  {onDelete && <button className="text-red-600 hover:underline" onClick={() => onDelete(r.id)}>Hapus</button>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

export default InventoryTable;


