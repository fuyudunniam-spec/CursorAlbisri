import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, DollarSign, Building2, School } from "lucide-react";
import { koperasiService } from "@/services/koperasi.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShiftControl from "./components/ShiftControl";
import ProductSelector from "./components/ProductSelector";
import PaymentDialog from "./components/PaymentDialog";
import type { KasirCartItem, ProfitSharing } from "@/types/koperasi.types";

export default function KasirPage() {
  const [cart, setCart] = useState<KasirCartItem[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [simpleMode, setSimpleMode] = useState(true); // Mode sederhana tanpa shift
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        if (!simpleMode) {
          loadActiveShift(data.user.id);
        }
      }
    });
  }, [simpleMode]);

  const loadActiveShift = async (kasirId: string) => {
    const shift = await koperasiService.getActiveShift(kasirId);
    setActiveShift(shift);
  };

  const { data: produkList = [] } = useQuery({
    queryKey: ['koperasi-produk-active'],
    queryFn: () => koperasiService.getProduk({ is_active: true }),
  });

  const { data: stockList = [] } = useQuery({
    queryKey: ['koperasi-stock'],
    queryFn: koperasiService.getStock,
  });

  const addToCart = (produkId: string, priceType: 'ecer' | 'grosir' = 'ecer') => {
    console.log('addToCart called:', { produkId, priceType, produkListLength: produkList.length, stockListLength: stockList.length });
    
    const produk = produkList.find(p => p.id === produkId);
    if (!produk) {
      console.error('Produk tidak ditemukan:', produkId, 'Available IDs:', produkList.map(p => p.id));
      toast.error('Produk tidak ditemukan');
      return;
    }

    // Stock data comes from kop_barang which has 'id' field, not 'produk_id'
    const stock = stockList.find((s: any) => {
      const match = s.id === produkId || s.produk_id === produkId;
      if (match) {
        console.log('Stock found:', { id: s.id, produk_id: s.produk_id, stok: s.stok, stock: s.stock });
      }
      return match;
    });

    // If stock not found or stok is null, allow adding to cart but warn user
    const stokTersedia = stock?.stok ?? stock?.stock ?? 0;
    if (!stock) {
      console.warn('Stock data not found for product:', produkId, 'Available stock IDs:', stockList.map((s: any) => s.id || s.produk_id));
    }
    
    console.log('Adding to cart:', { produkId, nama: produk.nama_produk, stokTersedia });

    // Tentukan harga berdasarkan priceType
    const hargaJual = priceType === 'grosir' 
      ? (produk.harga_jual_grosir || produk.harga_jual_ecer || produk.harga_jual || 0)
      : (produk.harga_jual_ecer || produk.harga_jual || 0);

    const existingItem = cart.find(item => 
      item.produk_id === produkId && item.price_type === priceType
    );
    
    if (existingItem) {
      if (stokTersedia > 0 && existingItem.jumlah + 1 > stokTersedia) {
        toast.error('Stock tidak mencukupi');
        return;
      }
      updateCartItem(produkId, existingItem.jumlah + 1, priceType);
      toast.success(`${produk.nama_produk} ditambahkan ke keranjang`);
    } else {
      if (stokTersedia <= 0 && stokTersedia !== null && stokTersedia !== undefined) {
        toast.error('Stock habis');
        return;
      }
      
      const newItem: KasirCartItem = {
        produk_id: produk.id,
        kode_produk: produk.kode_produk,
        nama_produk: produk.nama_produk,
        satuan: produk.satuan,
        harga_jual: hargaJual,
        harga_beli: produk.harga_beli,
        jumlah: 1,
        diskon: 0,
        subtotal: hargaJual,
        stock_tersedia: stokTersedia,
        sumber_modal_id: produk.sumber_modal_id,
        price_type: priceType,
      };
      setCart([...cart, newItem]);
      toast.success(`${produk.nama_produk} ditambahkan ke keranjang`);
    }
  };

  const updateCartItem = (produkId: string, jumlah: number, priceType?: 'ecer' | 'grosir') => {
    setCart(cart.map(item => {
      if (item.produk_id === produkId && (!priceType || item.price_type === priceType)) {
        const newJumlah = Math.max(0, jumlah);
        return {
          ...item,
          jumlah: newJumlah,
          subtotal: (newJumlah * item.harga_jual) - item.diskon,
        };
      }
      return item;
    }).filter(item => item.jumlah > 0));
  };

  const switchPriceType = (produkId: string, currentPriceType: 'ecer' | 'grosir') => {
    const produk = produkList.find(p => p.id === produkId);
    if (!produk) return;

    const newPriceType = currentPriceType === 'ecer' ? 'grosir' : 'ecer';
    const newHarga = newPriceType === 'grosir'
      ? (produk.harga_jual_grosir || produk.harga_jual_ecer || 0)
      : (produk.harga_jual_ecer || produk.harga_jual || 0);

    setCart(cart.map(item => {
      if (item.produk_id === produkId && item.price_type === currentPriceType) {
        return {
          ...item,
          harga_jual: newHarga,
          price_type: newPriceType,
          subtotal: (item.jumlah * newHarga) - item.diskon,
        };
      }
      return item;
    }));
  };

  const updateDiskon = (produkId: string, diskon: number) => {
    setCart(cart.map(item => {
      if (item.produk_id === produkId) {
        return {
          ...item,
          diskon: Math.max(0, diskon),
          subtotal: (item.jumlah * item.harga_jual) - Math.max(0, diskon),
        };
      }
      return item;
    }));
  };

  const removeFromCart = (produkId: string) => {
    setCart(cart.filter(item => item.produk_id !== produkId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculate profit sharing for each cart item
  const calculateItemProfitSharing = (item: KasirCartItem): ProfitSharing & { owner_type: 'koperasi' | 'yayasan' } => {
    const produk = produkList.find(p => p.id === item.produk_id);
    if (!produk) {
      return {
        bagian_yayasan: 0,
        bagian_koperasi: item.subtotal,
        margin: item.subtotal,
        owner_type: 'koperasi',
      };
    }
    
    // Ensure owner_type has a default value if missing
    const ownerType = produk.owner_type || 'koperasi';
    const produkWithDefaults = {
      ...produk,
      owner_type: ownerType,
      bagi_hasil_yayasan: produk.bagi_hasil_yayasan || (ownerType === 'yayasan' ? 70 : 0),
    };
    
    const profitSharing = koperasiService.calculateProfitSharing(item.subtotal, produkWithDefaults);
    return {
      ...profitSharing,
      owner_type: ownerType,
    };
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.jumlah * item.harga_jual), 0);
  const totalDiskon = cart.reduce((sum, item) => sum + item.diskon, 0);
  const total = subtotal - totalDiskon;

  // Profit sharing calculation is still used internally for payment processing
  // but not displayed in the UI (removed for cashier simplicity)

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }
    if (!simpleMode && !activeShift) {
      toast.error('Shift belum dibuka');
      return;
    }
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    clearCart();
    queryClient.invalidateQueries({ queryKey: ['koperasi-stock'] });
    queryClient.invalidateQueries({ queryKey: ['koperasi-penjualan'] });
  };

  // Mode sederhana: langsung tampilkan kasir tanpa shift
  if (!simpleMode && !activeShift) {
    return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Santra Mart</h1>
              <p className="text-muted-foreground">Koperasi Pesantren Anak Yatim Al-Bisri</p>
            </div>
          <Button variant="outline" onClick={() => setSimpleMode(true)}>
            Mode Sederhana
          </Button>
        </div>
        <ShiftControl onShiftChange={() => loadActiveShift(userId)} />
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Santra Mart</h1>
            <p className="text-muted-foreground">
              Koperasi Pesantren Anak Yatim Al-Bisri
            </p>
          </div>
        <div className="flex gap-2">
          {simpleMode ? (
            <Button variant="outline" onClick={() => setSimpleMode(false)}>
              Aktifkan Shift
            </Button>
          ) : (
            <ShiftControl activeShift={activeShift} onShiftChange={() => loadActiveShift(userId)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selector */}
        <div className="lg:col-span-2">
          <ProductSelector 
            produkList={produkList} 
            onSelectProduk={(produkId, priceType) => addToCart(produkId, priceType)} 
          />
        </div>

        {/* Cart */}
        <div>
          <Card className="shadow-lg border-0 sticky top-4">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="w-6 h-6" />
                  Keranjang
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {cart.length} item
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Keranjang kosong</p>
                  <p className="text-sm text-muted-foreground mt-1">Pilih produk untuk memulai</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {cart.map((item, index) => {
                      const profitSharing = calculateItemProfitSharing(item);
                      const isYayasanProduct = profitSharing.owner_type === 'yayasan';
                      
                      return (
                        <div 
                          key={item.produk_id}
                          className="transition-all duration-300 ease-out"
                          style={{ 
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          <div 
                            className={`group relative rounded-xl p-4 space-y-3 transition-all duration-200 ${
                              isYayasanProduct 
                                ? 'bg-gradient-to-br from-blue-50/80 to-blue-100/50 border-2 border-blue-200/50' 
                                : 'bg-gradient-to-br from-green-50/80 to-green-100/50 border-2 border-green-200/50'
                            } hover:shadow-lg hover:scale-[1.02]`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="font-semibold text-base truncate">{item.nama_produk}</h4>
                                  {isYayasanProduct ? (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300 shrink-0">
                                      <School className="w-3 h-3 mr-1" />
                                      Yayasan
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300 shrink-0">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      Koperasi
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                  <p className="text-sm text-muted-foreground">
                                    Rp {item.harga_jual.toLocaleString('id-ID')} / {item.satuan}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {item.price_type === 'grosir' ? 'Grosir' : 'Ecer'}
                                  </Badge>
                                  {(() => {
                                    const produk = produkList.find(p => p.id === item.produk_id);
                                    const hasBothPrices = produk && produk.harga_jual_grosir && 
                                      produk.harga_jual_grosir !== produk.harga_jual_ecer;
                                    if (hasBothPrices) {
                                      return (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-xs px-2"
                                          onClick={() => switchPriceType(item.produk_id, item.price_type || 'ecer')}
                                        >
                                          Switch ke {item.price_type === 'grosir' ? 'Ecer' : 'Grosir'}
                                        </Button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                
                                <div className="flex gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground">Qty:</label>
                                    <Input
                                      type="number"
                                      value={item.jumlah}
                                      onChange={(e) => updateCartItem(item.produk_id, parseFloat(e.target.value))}
                                      className="w-20 h-9 text-center font-medium"
                                      min="0"
                                      max={item.stock_tersedia}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-xs text-muted-foreground block mb-1">Diskon:</label>
                                    <Input
                                      type="number"
                                      value={item.diskon}
                                      onChange={(e) => updateDiskon(item.produk_id, parseFloat(e.target.value))}
                                      placeholder="0"
                                      className="h-9 text-sm"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.produk_id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">Subtotal:</span>
                              <span className="text-lg font-bold text-primary">
                                Rp {item.subtotal.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3 pt-4 border-t-2 border-dashed">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {totalDiskon > 0 && (
                      <div className="flex justify-between items-center text-sm text-red-600">
                        <span>Diskon:</span>
                        <span className="font-medium">- Rp {totalDiskon.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-lg font-semibold">TOTAL:</span>
                      <span className="text-2xl font-bold text-primary">
                        Rp {total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={clearCart} 
                      className="flex-1 h-11 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors"
                    >
                      Batal
                    </Button>
                    <Button 
                      onClick={handlePayment} 
                      className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Bayar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        cart={cart}
        subtotal={subtotal}
        totalDiskon={totalDiskon}
        total={total}
        shiftId={simpleMode ? null : activeShift?.id}
        kasirId={userId}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
