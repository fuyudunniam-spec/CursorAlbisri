import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, DollarSign, Wallet, Shield, Activity, GraduationCap, FileText, Users, Award, Calendar } from "lucide-react";
import { formatRupiah } from "@/utils/inventaris.utils";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ProfileContext {
  santri: any;
  santriId: string;
  programAktif: any[];
  financialSummary: any;
  hafalanProgress: {
    juz: number;
    progress: number;
    changeThisMonth: number;
  };
  kehadiranProgress: {
    persentase: number;
    hadir: number;
    total: number;
  };
  saldoTabungan: number;
}

const RingkasanPage = () => {
  const { santri, programAktif, financialSummary, hafalanProgress, kehadiranProgress, saldoTabungan } = useOutletContext<ProfileContext>();

  return (
    <div className="space-y-6 mt-6">
      {/* 4 Kartu Progres Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* 1. Progres Hafalan Qur'an */}
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              Progres Hafalan Qur'an
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hafalanProgress.juz > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-foreground">
                    {hafalanProgress.juz}
                  </div>
                  <div className="text-sm text-muted-foreground">/ 30 Juz</div>
                </div>
                <Progress value={hafalanProgress.progress} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {hafalanProgress.progress.toFixed(0)}% selesai
                  </span>
                  {hafalanProgress.changeThisMonth !== 0 && (
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      hafalanProgress.changeThisMonth > 0 
                        ? "bg-primary/10 text-primary" 
                        : "bg-slate-100 text-slate-600"
                    )}>
                      {hafalanProgress.changeThisMonth > 0 ? '+' : ''}
                      {hafalanProgress.changeThisMonth} ayat bulan ini
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                <p className="text-sm text-muted-foreground">
                  Belum ada data hafalan
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Kehadiran */}
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg text-white">
                <CheckCircle className="w-4 h-4" />
              </div>
              Kehadiran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kehadiranProgress.total > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <div className="text-4xl font-bold text-foreground">
                    {kehadiranProgress.persentase}%
                  </div>
                  <div className="text-sm text-muted-foreground">semester ini</div>
                </div>
                <Progress 
                  value={kehadiranProgress.persentase} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {kehadiranProgress.hadir} dari {kehadiranProgress.total} pertemuan
                  </span>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      kehadiranProgress.persentase >= 80 
                        ? "bg-primary/10 text-primary" 
                        : kehadiranProgress.persentase >= 60
                        ? "bg-primary/5 text-primary/80"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {kehadiranProgress.persentase >= 80 
                      ? "Sangat Baik" 
                      : kehadiranProgress.persentase >= 60
                      ? "Baik"
                      : "Perlu Perhatian"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                <p className="text-sm text-muted-foreground">
                  Belum ada data kehadiran untuk semester ini
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Ringkasan Keuangan Pendidikan */}
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg text-white">
                <DollarSign className="w-4 h-4" />
              </div>
              Ringkasan Keuangan Pendidikan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {santri?.kategori?.includes('Binaan') ? (
              <>
                <div className="text-3xl font-bold text-foreground">
                  {financialSummary.total_bantuan_yayasan 
                    ? formatRupiah(financialSummary.total_bantuan_yayasan) 
                    : 'Rp 0'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total layanan yang diterima untuk pendidikan
                </p>
                <Badge variant="secondary" className="text-xs">
                  Ditanggung Yayasan
                </Badge>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">
                  {financialSummary.sisa_spp 
                    ? formatRupiah(financialSummary.sisa_spp) 
                    : 'Rp 0'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {(financialSummary.sisa_spp || 0) === 0 
                    ? "Semua tagihan sudah lunas" 
                    : "Sisa tagihan yang perlu dibayar"}
                </p>
                <Badge 
                  variant={(financialSummary.sisa_spp || 0) === 0 ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    (financialSummary.sisa_spp || 0) === 0 
                      ? "bg-primary/10 text-primary" 
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {(financialSummary.sisa_spp || 0) === 0 ? 'Lunas' : 'Ada Tagihan'}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* 4. Tabungan Santri */}
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg text-white">
                <Wallet className="w-4 h-4" />
              </div>
              Tabungan Santri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-foreground">
              {formatRupiah(saldoTabungan)}
            </div>
            <p className="text-sm text-muted-foreground">
              Saldo tabungan saat ini
            </p>
          </CardContent>
        </Card>

        {/* 5. Status Perilaku/Pengasuhan */}
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg text-white">
                <Shield className="w-4 h-4" />
              </div>
              Status Perilaku & Pengasuhan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <Activity className="w-10 h-10 mx-auto mb-3 text-primary/30" />
              <p className="text-sm text-muted-foreground">
                Fitur ini sedang dalam pengembangan
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Akan menampilkan tracking poin kedisiplinan dan catatan pengasuhan
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kartu Status Tambahan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-6">
        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Program Aktif</p>
            </div>
            <div className="text-2xl font-bold text-foreground">{programAktif.length}</div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Dokumen</p>
            </div>
            <div className="text-2xl font-bold text-foreground">-</div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Award className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Kategori</p>
            </div>
            <div className="text-sm font-semibold truncate text-foreground">
              {santri?.kategori || '-'}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Angkatan</p>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {santri?.angkatan || '-'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RingkasanPage;

