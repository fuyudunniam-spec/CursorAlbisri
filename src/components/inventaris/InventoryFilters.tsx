import { memo, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { getKategoriOptions, ZONA_OPTIONS } from "@/utils/inventaris.utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

type FilterState = {
  search: string;
  kategori: string;
  kondisi: string;
  tipe_item: string;
  zona: string;
  lokasi: string;
};

type Props = {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  tipeItem: string;
};

const KONDISI_OPTIONS = [
  { value: "all", label: "Semua Kondisi" },
  { value: "Baik", label: "Baik" },
  { value: "Baik", label: "Baik" },
  { value: "Perlu perbaikan", label: "Perlu perbaikan" },
  { value: "Rusak", label: "Rusak" },
];

const TIPE_OPTIONS = [
  { value: "all", label: "Semua Tipe" },
  { value: "Aset", label: "Aset" },
  { value: "Komoditas", label: "Komoditas" },
];

const InventoryFilters = memo(({ filters, onFiltersChange, tipeItem }: Props) => {
  const debouncedSearch = useDebounce(filters.search, 300);
  
  const kategoriOptions = useMemo(() => {
    const options = getKategoriOptions(tipeItem);
    return [
      { value: "all", label: "Semua Kategori" },
      ...options.map(k => ({ value: k, label: k }))
    ];
  }, [tipeItem]);

  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ search: value });
  }, [onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    onFiltersChange({ [key]: value });
  }, [onFiltersChange]);

  const hasActiveFilters = useMemo(() => {
    return filters.search || 
           filters.kategori !== "all" || 
           filters.kondisi !== "all" || 
           filters.tipe_item !== "all" || 
           filters.zona !== "all" || 
           filters.lokasi;
  }, [filters]);

  const resetFilters = useCallback(() => {
    onFiltersChange({
      search: "",
      kategori: "all",
      kondisi: "all",
      tipe_item: "all",
      zona: "all",
      lokasi: ""
    });
  }, [onFiltersChange]);

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Cari Barang</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Nama barang, kategori..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Tipe Item</label>
          <Select 
            value={filters.tipe_item} 
            onValueChange={(value) => handleFilterChange("tipe_item", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tipe" />
            </SelectTrigger>
            <SelectContent>
              {TIPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === "all" ? option.label : `📦 ${option.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Kategori</label>
          <Select 
            value={filters.kategori} 
            onValueChange={(value) => handleFilterChange("kategori", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {kategoriOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === "all" ? option.label : `🏷️ ${option.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Kondisi</label>
          <Select 
            value={filters.kondisi} 
            onValueChange={(value) => handleFilterChange("kondisi", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kondisi" />
            </SelectTrigger>
            <SelectContent>
              {KONDISI_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === "all" ? option.label : `🔧 ${option.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Zona</label>
          <Select 
            value={filters.zona} 
            onValueChange={(value) => handleFilterChange("zona", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Zona</SelectItem>
              {ZONA_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  🏢 {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Lokasi</label>
          <Input
            type="text"
            value={filters.lokasi}
            onChange={(e) => handleFilterChange("lokasi", e.target.value)}
            placeholder="Gudang, ruang, dll..."
          />
        </div>
      </div>
      
      {hasActiveFilters && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Filter aktif: 
            {filters.search && ` Cari: "${filters.search}"`}
            {filters.kategori !== "all" && ` • Kategori: ${filters.kategori}`}
            {filters.kondisi !== "all" && ` • Kondisi: ${filters.kondisi}`}
            {filters.tipe_item !== "all" && ` • Tipe: ${filters.tipe_item}`}
            {filters.zona !== "all" && ` • Zona: ${filters.zona}`}
            {filters.lokasi && ` • Lokasi: ${filters.lokasi}`}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  );
});

InventoryFilters.displayName = "InventoryFilters";

export default InventoryFilters;
