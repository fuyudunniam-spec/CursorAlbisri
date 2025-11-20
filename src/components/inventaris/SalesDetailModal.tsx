import { memo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, formatDate } from "@/utils/inventaris.utils";
import { Package, Calendar, User, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";

type SalesDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemId: string;
};

type TransactionDetail = {
  id: string;
  tanggal: string;
  penerima: string;
  jumlah: number;
  harga_satuan: number;
  harga_total: number;
  catatan?: string;
  created_at: string;
};

const SalesDetailModal = memo(({ isOpen, onClose, itemName, itemId }: SalesDetailModalProps) => {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalQuantity: 0,
    totalRevenue: 0,
    averagePrice: 0
  });

  useEffect(() => {
    if (isOpen && itemId) {
      loadTransactionDetails();
    }
  }, [isOpen, itemId]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("transaksi_inventaris")
        .select("*")
        .eq("item_id", itemId)
        .eq("tipe", "Keluar")
        .not("harga_satuan", "is", null)
        .gt("harga_satuan", 0)
        .order("tanggal", { ascending: false });

      if (error) throw error;

      const transactionDetails = data || [];
      setTransactions(transactionDetails);

      // Calculate summary
      const totalQuantity = transactionDetails.reduce((sum, tx) => sum + (tx.jumlah || 0), 0);
      const totalRevenue = transactionDetails.reduce((sum, tx) => sum + (tx.harga_total || 0), 0);
      const averagePrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

      setSummary({
        totalTransactions: transactionDetails.length,
        totalQuantity,
        totalRevenue,
        averagePrice
      });

    } catch (error) {
      console.error("Error loading transaction details:", error);
      toast.error("Gagal memuat detail transaksi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Detail Penjualan: {itemName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalTransactions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Terjual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.totalQuantity}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Pemasukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatRupiah(summary.totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Rata-rata Harga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatRupiah(summary.averagePrice)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Details Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h3>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada transaksi penjualan untuk item ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      {/* Tanggal */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(transaction.tanggal)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Penerima */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.penerima || "Tidak ada nama"}
                          </div>
                        </div>
                      </div>

                      {/* Jumlah */}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.jumlah} unit
                        </div>
                        <div className="text-xs text-gray-500">
                          @ {formatRupiah(transaction.harga_satuan)}
                        </div>
                      </div>

                      {/* Total Pemasukan */}
                      <div>
                        <div className="text-sm font-bold text-green-600">
                          {formatRupiah(transaction.harga_total)}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <Badge className="bg-green-100 text-green-800">
                          Terjual
                        </Badge>
                      </div>

                      {/* Catatan */}
                      <div>
                        {transaction.catatan && (
                          <div className="text-xs text-gray-500 truncate" title={transaction.catatan}>
                            {transaction.catatan}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

SalesDetailModal.displayName = "SalesDetailModal";

export default SalesDetailModal;
