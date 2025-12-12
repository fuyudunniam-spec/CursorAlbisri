import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, Store, Filter, ArrowUpDown, X } from "lucide-react";
import type { KoperasiProduk } from "@/types/koperasi.types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductSelectorProps {
  produkList: KoperasiProduk[];
  onSelectProduk: (produkId: string, priceType?: 'ecer' | 'grosir') => void;
}

export default function ProductSelector({ produkList, onSelectProduk }: ProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "koperasi" | "yayasan">("all");
  const [sortBy, setSortBy] = useState<"nama" | "harga-asc" | "harga-desc">("nama");
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique categories from produk list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    produkList.forEach((p) => {
      if (p.kategori) cats.add(p.kategori);
    });
    return Array.from(cats);
  }, [produkList]);

  const filteredProduk = useMemo(() => {
    let filtered = produkList
      // Hanya tampilkan produk yang punya minimal satu harga jual terisi
      .filter((p) => (p.harga_jual_ecer || 0) > 0 || (p.harga_jual_grosir || 0) > 0)
      // Hanya tampilkan produk yang memiliki stok > 0 (validasi ketat)
      .filter((p) => {
        const stok = Math.max(0, Math.floor(p.stok ?? p.stock ?? 0));
        return stok > 0;
      })
      .filter((p) => {
        const matchesSearch =
          p.nama_produk.toLowerCase().includes(search.toLowerCase()) ||
          p.kode_produk.toLowerCase().includes(search.toLowerCase());
        const matchesOwner =
          ownerFilter === "all" ? true : (p.owner_type || "koperasi") === ownerFilter;
        return matchesSearch && matchesOwner;
      });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "nama") {
        return a.nama_produk.localeCompare(b.nama_produk);
      } else if (sortBy === "harga-asc") {
        return (a.harga_jual_ecer || 0) - (b.harga_jual_ecer || 0);
      } else {
        return (b.harga_jual_ecer || 0) - (a.harga_jual_ecer || 0);
      }
    });

    return filtered;
  }, [produkList, search, ownerFilter, sortBy]);

  const hasActiveFilters = search || ownerFilter !== "all" || sortBy !== "nama";

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6" />
            Pilih Produk
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Cari nama atau kode produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 text-base bg-background/50 backdrop-blur-sm border-2 focus:border-primary/50 transition-all"
          />
          {search && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearch("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant={ownerFilter === "all" ? "default" : "outline"}
            onClick={() => setOwnerFilter("all")}
            className="h-8 text-xs"
          >
            Semua
          </Button>
          <Button
            size="sm"
            variant={ownerFilter === "koperasi" ? "default" : "outline"}
            onClick={() => setOwnerFilter("koperasi")}
            className="h-8 text-xs"
          >
            <Store className="w-3 h-3 mr-1" />
            Koperasi
          </Button>
          <Button
            size="sm"
            variant={ownerFilter === "yayasan" ? "default" : "outline"}
            onClick={() => setOwnerFilter("yayasan")}
            className="h-8 text-xs"
          >
            <Store className="w-3 h-3 mr-1" />
            Yayasan
          </Button>
          
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setOwnerFilter("all");
                setSortBy("nama");
              }}
              className="h-8 text-xs text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-background/50 rounded-lg border space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Urutkan
                </label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nama">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Nama A-Z
                      </div>
                    </SelectItem>
                    <SelectItem value="harga-asc">Harga: Rendah ke Tinggi</SelectItem>
                    <SelectItem value="harga-desc">Harga: Tinggi ke Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {filteredProduk.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Tidak ada produk yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredProduk.map((produk) => {
              const ownerType = produk.owner_type || "koperasi";
              const stok = produk.stok ?? produk.stock ?? 0;
              const isStokHabis = stok <= 0;
              
              // Tentukan harga default (ecer jika ada, jika tidak grosir)
              const hasEcer = (produk.harga_jual_ecer || produk.harga_jual || 0) > 0;
              const hasGrosir = (produk.harga_jual_grosir || 0) > 0;
              const defaultPriceType = hasEcer ? 'ecer' : (hasGrosir ? 'grosir' : 'ecer');
              
              return (
                <div
                  key={produk.id}
                  onClick={() => !isStokHabis && onSelectProduk(produk.id, defaultPriceType)}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-200 group cursor-pointer ${
                    isStokHabis 
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                      : 'border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className={`font-semibold text-base transition-colors truncate ${
                          !isStokHabis && 'group-hover:text-primary'
                        }`}>
                          {produk.nama_produk}
                        </h3>
                        <Badge 
                          variant={ownerType === "yayasan" ? "outline" : "secondary"} 
                          className="flex items-center gap-1 text-xs px-2 py-0.5 shrink-0"
                        >
                          <Store className="w-3 h-3" />
                          {ownerType === "yayasan" ? "Yayasan" : "Koperasi"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">
                          {produk.kode_produk}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            stok > 0 
                              ? 'bg-green-50 text-green-700 border-green-300' 
                              : 'bg-red-50 text-red-700 border-red-300'
                          }`}
                        >
                          Stok: {stok.toLocaleString("id-ID")} {produk.satuan}
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-2">
                          {hasEcer && (
                            <span className="text-xs">
                              Ecer: <span className="font-medium text-foreground">
                                Rp {Math.round(produk.harga_jual_ecer || produk.harga_jual || 0).toLocaleString("id-ID")}
                              </span>
                            </span>
                          )}
                          {hasGrosir && produk.harga_jual_grosir !== produk.harga_jual_ecer && (
                            <>
                              {hasEcer && <span className="text-muted-foreground">•</span>}
                              <span className="text-xs">
                                Grosir: <span className="font-medium text-primary">
                                  Rp {Math.round(produk.harga_jual_grosir).toLocaleString("id-ID")}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isStokHabis && (
                      <div className="shrink-0">
                        <Badge variant="secondary" className="text-xs px-3 py-1">
                          Klik untuk tambah
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
