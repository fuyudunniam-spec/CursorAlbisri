import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatRupiah } from "@/utils/inventaris.utils";

interface ProfileContext {
  financialSummary: any;
  santri: any;
}

const KeuanganPage = () => {
  const { financialSummary, santri } = useOutletContext<ProfileContext>();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Ringkasan Keuangan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {santri?.kategori?.includes('Binaan') ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Layanan Diterima</p>
                <p className="text-2xl font-bold">
                  {formatRupiah(financialSummary.total_bantuan_yayasan || 0)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Tagihan</p>
                <p className="text-2xl font-bold">
                  {formatRupiah(financialSummary.total_spp || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dibayar</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatRupiah(financialSummary.total_dibayar || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sisa Tagihan</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatRupiah(financialSummary.sisa_spp || 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuanganPage;

