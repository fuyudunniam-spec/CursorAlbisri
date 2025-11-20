import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, Table } from "lucide-react";
import { exportToCSV } from "@/utils/inventaris.utils";

type Props = {
  data: any[];
  filters: any;
  type: "inventory" | "transactions";
  disabled?: boolean;
};

const ExportMenu = memo(({ data, filters, type, disabled = false }: Props) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      // Apply current filters to data
      let filteredData = [...data];
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.nama_barang?.toLowerCase().includes(searchLower) ||
          item.kategori?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.kategori && filters.kategori !== "all") {
        filteredData = filteredData.filter(item => item.kategori === filters.kategori);
      }
      
      if (filters.kondisi && filters.kondisi !== "all") {
        filteredData = filteredData.filter(item => item.kondisi === filters.kondisi);
      }
      
      if (filters.tipe_item && filters.tipe_item !== "all") {
        filteredData = filteredData.filter(item => item.tipe_item === filters.tipe_item);
      }
      
      if (filters.zona && filters.zona !== "all") {
        filteredData = filteredData.filter(item => item.zona === filters.zona);
      }
      
      if (filters.lokasi) {
        filteredData = filteredData.filter(item => 
          item.lokasi?.toLowerCase().includes(filters.lokasi.toLowerCase())
        );
      }

      // Format data for export
      const exportData = filteredData.map(item => {
        if (type === "inventory") {
          return {
            "Nama Barang": item.nama_barang || "",
            "Tipe Item": item.tipe_item || "",
            "Kategori": item.kategori || "",
            "Zona": item.zona || "",
            "Lokasi": item.lokasi || "",
            "Kondisi": item.kondisi || "",
            "Jumlah": item.jumlah || 0,
            "Satuan": item.satuan || "",
            "Harga Perolehan": item.harga_perolehan || 0,
            "Total Nilai": (item.jumlah || 0) * (item.harga_perolehan || 0),
            "Supplier": item.supplier || "",
            "Min Stock": item.min_stock || 0,
            "Tanggal Kedaluwarsa": item.tanggal_kedaluwarsa || "",
            "Keterangan": item.keterangan || "",
            "Tanggal Dibuat": item.created_at || ""
          };
        } else {
          return {
            "Tanggal": item.tanggal || "",
            "Item": item.nama_barang || "",
            "Tipe": item.tipe || "",
            "Jumlah": item.jumlah || 0,
            "Harga Satuan": item.harga_satuan || 0,
            "Total": (item.jumlah || 0) * (item.harga_satuan || 0),
            "Penerima": item.penerima || "",
            "Catatan": item.catatan || "",
            "Tanggal Dibuat": item.created_at || ""
          };
        }
      });

      const filename = `${type === "inventory" ? "inventaris" : "transaksi"}_${new Date().toISOString().split('T')[0]}`;
      exportToCSV(exportData, filename);
      
    } catch (error) {
      console.error("Export failed:", error);
      alert("Gagal mengekspor data. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    // Placeholder for PDF export
    alert("Fitur export PDF akan segera tersedia");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? "Mengekspor..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
          <Table className="h-4 w-4 mr-2" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ExportMenu.displayName = "ExportMenu";

export default ExportMenu;
