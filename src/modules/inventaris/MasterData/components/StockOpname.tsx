import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Check, AlertTriangle, Package } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listInventory, createTransaction, getInventoryItem } from '@/services/inventaris.service';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StockOpnameProps {
  onClose: () => void;
  onSuccess?: () => void; // Callback ketika stock opname berhasil
}

interface OpnameItem {
  id: string;
  nama_barang: string;
  kategori: string;
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;
  catatan: string;
}

const StockOpname = ({ onClose, onSuccess }: StockOpnameProps) => {
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory-opname'],
    queryFn: () => listInventory({ page: 1, pageSize: 1000 }, {}),
    staleTime: 30000
  });

  const items = inventoryData?.data || [];

  const startOpname = () => {
    const opnameData = items.map(item => ({
      id: item.id,
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      stok_sistem: item.jumlah || 0,
      stok_fisik: item.jumlah || 0, // Start with system value
      selisih: 0,
      catatan: ''
    }));
    setOpnameItems(opnameData);
  };

  const updateStokFisik = (itemId: string, stokFisik: number) => {
    setOpnameItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const selisih = stokFisik - item.stok_sistem;
        return { ...item, stok_fisik: stokFisik, selisih };
      }
      return item;
    }));
  };

  const updateCatatan = (itemId: string, catatan: string) => {
    setOpnameItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, catatan } : item
    ));
  };

  const processOpname = async () => {
    setIsProcessing(true);
    try {
      // Filter items yang memiliki selisih (perlu penyesuaian)
      const itemsWithSelisih = opnameItems.filter(item => item.selisih !== 0);
      
      if (itemsWithSelisih.length === 0) {
        toast.info('Tidak ada penyesuaian yang diperlukan. Semua stok sesuai dengan sistem.');
        onClose();
        return;
      }

      // Buat transaksi Stocktake untuk setiap item yang berbeda
      const today = new Date().toISOString().split('T')[0];
      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsWithSelisih) {
        try {
          const transactionPayload = {
            item_id: item.id,
            tipe: 'Stocktake' as const,
            jumlah: Math.abs(item.selisih), // Jumlah perubahan (selisih absolute)
            tanggal: today,
            catatan: item.catatan || `Stock Opname: ${item.selisih > 0 ? 'Penambahan' : 'Pengurangan'} ${Math.abs(item.selisih)} unit`,
            before_qty: item.stok_sistem, // Stok sebelum opname
            after_qty: item.stok_fisik, // Stok setelah opname
            harga_satuan: null, // Stocktake tidak punya harga
          };

          console.log(`📝 Creating stocktake transaction for item ${item.nama_barang}:`, {
            item_id: item.id,
            before_qty: transactionPayload.before_qty,
            after_qty: transactionPayload.after_qty,
            selisih: item.selisih,
            jumlah_field: transactionPayload.jumlah
          });

          const result = await createTransaction(transactionPayload);
          
          console.log(`✅ Stocktake transaction created successfully:`, {
            transaction_id: result?.id,
            item_id: result?.item_id,
            stored_before_qty: (result as any)?.before_qty,
            stored_after_qty: (result as any)?.after_qty
          });
          
          // Verifikasi bahwa stok sudah ter-update di database
          await new Promise(resolve => setTimeout(resolve, 300));
          
          try {
            const { data: updatedItem, error: verifyError } = await supabase
              .from('inventaris')
              .select('id, nama_barang, jumlah')
              .eq('id', item.id)
              .single();
            
            if (verifyError) {
              console.error('Error verifying updated stock:', verifyError);
            } else {
              console.log(`Verified stock for ${item.nama_barang}:`, {
                expected: transactionPayload.after_qty,
                actual: updatedItem?.jumlah,
                match: updatedItem?.jumlah === transactionPayload.after_qty
              });
              
              if (updatedItem?.jumlah !== transactionPayload.after_qty) {
                console.warn(`⚠️ Stock mismatch! Expected ${transactionPayload.after_qty}, got ${updatedItem?.jumlah}`);
              }
            }
          } catch (verifyErr) {
            console.error('Error during stock verification:', verifyErr);
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error creating stocktake transaction for item ${item.id}:`, error);
          errorCount++;
        }
      }

      // Tunggu lebih lama untuk memastikan semua transaksi dan trigger database selesai
      console.log('All transactions created, waiting for database triggers to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verifikasi bahwa trigger sudah jalan - cek langsung dari database
      console.log('Verifying database triggers executed...');
      for (const item of itemsWithSelisih) {
        try {
          const { data: checkAfterTrigger, error: triggerCheckError } = await supabase
            .from('inventaris')
            .select('id, nama_barang, jumlah')
            .eq('id', item.id)
            .single();
          
          if (!triggerCheckError && checkAfterTrigger) {
            if (checkAfterTrigger.jumlah === item.stok_fisik) {
              console.log(`✅ Trigger verified - ${checkAfterTrigger.nama_barang} updated to ${checkAfterTrigger.jumlah}`);
            } else {
              console.warn(`⚠️ Trigger may not have executed - ${checkAfterTrigger.nama_barang} still shows ${checkAfterTrigger.jumlah}, expected ${item.stok_fisik}`);
            }
          }
        } catch (err) {
          console.error('Error checking trigger execution:', err);
        }
      }

      // Invalidate dan refetch semua query cache terkait inventaris
      console.log('Invalidating queries...');
      
      // Remove semua cache terkait inventaris untuk memastikan fresh data
      await Promise.all([
        queryClient.removeQueries({ queryKey: ['inventory-master'], exact: false }),
        queryClient.removeQueries({ queryKey: ['inventory-opname'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['inventory-master'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['inventory-opname'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['low-stock'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['near-expiry'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['inventory'], exact: false }),
      ]);

      console.log('Queries invalidated, refetching...');

      // Refetch queries dengan force
      const refetchResults = await Promise.allSettled([
        queryClient.refetchQueries({ 
          queryKey: ['inventory-master'], 
          exact: false,
          type: 'active'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['low-stock'], 
          exact: false,
          type: 'active'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['near-expiry'], 
          exact: false,
          type: 'active'
        }),
      ]);

      console.log('Refetch results:', refetchResults);

      // Verifikasi sekali lagi semua item yang di-update
      console.log('🔍 Final verification - checking updated items in database...');
      const verificationResults = [];
      for (const item of itemsWithSelisih) {
        try {
          const { data: finalCheck, error: checkError } = await supabase
            .from('inventaris')
            .select('id, nama_barang, jumlah, kategori')
            .eq('id', item.id)
            .single();
          
          if (!checkError && finalCheck) {
            const verified = {
              nama: finalCheck.nama_barang,
              expected: item.stok_fisik,
              actual: finalCheck.jumlah,
              before: item.stok_sistem,
              match: finalCheck.jumlah === item.stok_fisik,
              was_updated: finalCheck.jumlah !== item.stok_sistem,
              updated_correctly: finalCheck.jumlah === item.stok_fisik
            };
            
            console.log(`📊 Final check - ${finalCheck.nama_barang}:`, verified);
            verificationResults.push(verified);
            
            if (!verified.updated_correctly) {
              console.error(`❌ PROBLEM: ${finalCheck.nama_barang} was NOT updated correctly!`, verified);
            }
          } else {
            console.error(`❌ Error verifying item ${item.id}:`, checkError);
          }
        } catch (err) {
          console.error(`❌ Exception verifying item ${item.id}:`, err);
        }
      }
      
      console.log('📋 Verification Summary:', {
        total_checked: itemsWithSelisih.length,
        correctly_updated: verificationResults.filter(r => r.updated_correctly).length,
        incorrectly_updated: verificationResults.filter(r => !r.updated_correctly).length,
        results: verificationResults
      });

      // Log hasil
      console.log('Stock Opname Results:', {
        totalItems: opnameItems.length,
        itemsWithDifference: itemsWithSelisih.length,
        successCount,
        errorCount,
        adjustments: itemsWithSelisih.map(i => ({
          nama: i.nama_barang,
          sebelum: i.stok_sistem,
          sesudah: i.stok_fisik,
          selisih: i.selisih
        }))
      });

      if (errorCount > 0) {
        toast.warning(`Stock Opname selesai dengan peringatan. ${successCount} item berhasil, ${errorCount} item gagal.`);
      } else {
        toast.success(`Stock Opname selesai! ${successCount} item telah disesuaikan.`);
      }

      // Tunggu sedikit sebelum callback untuk memastikan semua proses selesai
      await new Promise(resolve => setTimeout(resolve, 500));

      // Panggil callback onSuccess jika ada
      if (onSuccess) {
        console.log('Calling onSuccess callback...');
        onSuccess();
      }

      // Tunggu sedikit sebelum menutup untuk memastikan UI sudah ter-update
      setTimeout(() => {
        console.log('Closing stock opname dialog...');
        onClose();
      }, 800);
    } catch (error) {
      console.error('Error processing stock opname:', error);
      toast.error('Gagal memproses stock opname');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSelisihColor = (selisih: number) => {
    if (selisih > 0) return 'text-green-600';
    if (selisih < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSelisihIcon = (selisih: number) => {
    if (selisih > 0) return <Check className="h-4 w-4 text-green-600" />;
    if (selisih < 0) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Stock Opname</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading inventory data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Opname - Penghitungan Fisik Barang</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {opnameItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Mulai Stock Opname</h3>
              <p className="text-muted-foreground mb-4">
                Proses ini akan menghitung semua barang secara fisik dan membandingkannya dengan data sistem.
              </p>
              <Button onClick={startOpname} className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Mulai Stock Opname
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{opnameItems.length}</div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {opnameItems.filter(item => item.selisih > 0).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Lebih dari Sistem</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {opnameItems.filter(item => item.selisih < 0).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Kurang dari Sistem</p>
                  </CardContent>
                </Card>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Daftar Item untuk Dihitung</h3>
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">Nama Barang</th>
                          <th className="text-left p-4 font-medium">Kategori</th>
                          <th className="text-left p-4 font-medium">Stok Sistem</th>
                          <th className="text-left p-4 font-medium">Stok Fisik</th>
                          <th className="text-left p-4 font-medium">Selisih</th>
                          <th className="text-left p-4 font-medium">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opnameItems.map((item) => (
                          <tr key={item.id} className="border-t hover:bg-muted/25">
                            <td className="p-4 font-medium">{item.nama_barang}</td>
                            <td className="p-4">
                              <Badge variant="secondary">{item.kategori}</Badge>
                            </td>
                            <td className="p-4">{item.stok_sistem}</td>
                            <td className="p-4">
                              <Input
                                type="number"
                                value={item.stok_fisik}
                                onChange={(e) => updateStokFisik(item.id, parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </td>
                            <td className="p-4">
                              <div className={`flex items-center gap-2 ${getSelisihColor(item.selisih)}`}>
                                {getSelisihIcon(item.selisih)}
                                <span className="font-medium">
                                  {item.selisih > 0 ? '+' : ''}{item.selisih}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Input
                                value={item.catatan}
                                onChange={(e) => updateCatatan(item.id, e.target.value)}
                                placeholder="Catatan..."
                                className="w-32"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={processOpname} 
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isProcessing ? 'Memproses...' : 'Selesaikan Stock Opname'}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOpname;
