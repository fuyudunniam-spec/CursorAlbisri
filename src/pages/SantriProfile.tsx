import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Award, Boxes, HandCoins, User, Users, GraduationCap, FileText, Calendar, Phone, MapPin, Edit, AlertCircle } from "lucide-react";
import DokumenSantriTab from "@/components/DokumenSantriTab";
import BantuanYayasanTab from "@/components/BantuanYayasanTab";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { TabunganSantriCard } from '@/components/TabunganSantri/TabunganSantriCard';

type DistribusiTx = {
  id: string;
  tanggal: string;
  item_nama: string;
  jumlah: number;
  satuan?: string | null;
  catatan?: string | null;
};

// Removed Beasiswa type - no longer using complex beasiswa workflow

const SantriProfile = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;

  // Debug log only once on mount
  useEffect(() => {
  console.log('🔍 SantriProfile initialized with:', { 
    santriId, 
    santriName, 
    url: window.location.href,
    searchParams: Object.fromEntries(searchParams.entries())
  });
  }, []); // Only run once on mount

  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<any>(null);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [programData, setProgramData] = useState<any[]>([]);
  const [distribusi, setDistribusi] = useState<DistribusiTx[]>([]);
  // Removed beasiswa-related state - no longer using complex beasiswa workflow
  
  // Use useMemo to prevent unnecessary recalculations
  const totalDistribusiQty = useMemo(() => 
    distribusi.reduce((a, b) => a + Number(b.jumlah || 0), 0), 
    [distribusi]
  );

  // Check if santri is a bantuan recipient
  const isBantuanRecipient = useMemo(() => 
    santri?.kategori?.includes('Binaan') || santri?.tipe_pembayaran === 'Bantuan Yayasan',
    [santri?.kategori, santri?.tipe_pembayaran]
  );
  
  // Removed totalBeasiswa calculation - no longer using complex beasiswa workflow

  // Removed beasiswa-related functions - no longer using complex beasiswa workflow

  useEffect(() => {
    (async () => {
      console.log('🔄 useEffect triggered with santriId:', santriId);
      
      if (!santriId) {
        console.warn('⚠️ No santriId provided, skipping data load');
        return;
      }
      
      setLoading(true);
      try {
        // Load santri main data
        console.log('📡 Fetching santri data for ID:', santriId);
        const { data: santriData, error: santriError } = await supabase
          .from('santri')
          .select('*')
          .eq('id', santriId)
          .single();

        console.log('✅ Santri data loaded:', { 
          hasData: !!santriData, 
          hasError: !!santriError, 
          nama: santriData?.nama_lengkap,
          nisn: santriData?.nisn,
          error: santriError 
        });

        if (!santriError && santriData) {
          console.log('💾 Setting santri state with:', santriData);
          setSantri(santriData);
          console.log('✅ Santri state updated');
        } else {
          console.error('❌ Error loading santri data:', santriError);
        }

        // Load wali data
        const { data: wali, error: waliError } = await supabase
          .from('santri_wali')
          .select('*')
          .eq('santri_id', santriId);

        console.log('Wali data loaded:', { wali, waliError });
        setWaliData(wali || []);

        // Load program data
        const { data: programs, error: programError } = await supabase
          .from('santri_kelas')
          .select('*')
          .eq('santri_id', santriId);

        console.log('Program data loaded:', { programs, programError });
        setProgramData(programs || []);

        // Distribusi barang kepada santri (receiver_type='santri')
        const { data: tx } = await supabase
          .from("transaksi_inventaris")
          .select("id,tanggal,catatan,jumlah,item:inventaris(nama_barang,satuan),receiver_type,receiver_id,receiver_name,tipe")
          .eq("tipe", "Keluar")
          .eq("receiver_type", "santri")
          .or(santriId ? `receiver_id.eq.${santriId}` : "receiver_id.is.null")
          .order("tanggal", { ascending: false })
          .limit(100);

        const d = (tx || []).map((t: any) => ({
          id: t.id,
          tanggal: t.tanggal,
          item_nama: t.item?.nama_barang || "-",
          jumlah: t.jumlah || 0,
          satuan: t.item?.satuan || "pcs",
          catatan: t.catatan || undefined,
        })) as DistribusiTx[];
        setDistribusi(d);

        // Removed beasiswa data fetching - no longer using complex beasiswa workflow
      } finally {
        setLoading(false);
      }
    })();
  }, [santriId, santriName]);

  // Debug display - show what we have (only log when state actually changes)
  useEffect(() => {
    if (santri) {
      console.log('🎨 State updated:', { 
    hasSantri: !!santri, 
    santriName: santri?.nama_lengkap,
    santriNISN: santri?.nisn,
    loading,
        santriId
  });
    }
  }, [santri, loading, santriId]); // Only log when these specific values change

  // If no santriId, show error and redirect
  if (!santriId) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-xl font-bold text-red-600">❌ ID Santri Tidak Ditemukan</div>
              <p className="text-muted-foreground">
                URL tidak memiliki parameter santriId yang valid.
              </p>
              <p className="text-sm text-muted-foreground">
                Current URL: {window.location.href}
              </p>
              <p className="text-sm text-muted-foreground">
                Search Params: {JSON.stringify(Object.fromEntries(searchParams.entries()))}
              </p>
              <Button onClick={() => navigate('/santri')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Data Santri
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Loading state */}
      {loading && !santri && (
        <div className="text-center py-12">
          <div className="text-lg font-semibold mb-2">⏳ Memuat data santri...</div>
          <div className="text-sm text-muted-foreground">Mohon tunggu sebentar</div>
        </div>
      )}

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border bg-gradient-to-b from-background to-muted/20">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-start justify-between">
              <div className="space-y-4 max-w-2xl">
                <div className="text-2xl lg:text-3xl font-bold">
                  {santri?.nama_lengkap || santriName || 'Memuat...'}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {santri?.id_santri && (
                    <Badge variant="outline" className="text-sm">
                      ID: {santri.id_santri}
                    </Badge>
                  )}
                  {santri?.kategori && (
                    <Badge className="bg-blue-600 text-sm">
                      {santri.kategori}
                    </Badge>
                  )}
                  {santri?.angkatan && (
                    <Badge variant="secondary" className="text-sm">
                      Angkatan {santri.angkatan}
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground leading-relaxed">
                  Ringkasan bantuan dan distribusi yang pernah diterima. Tampilan ini berfokus pada transparansi dan akuntabilitas penerimaan hak.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />Kembali
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = `/santri?edit=${santriId}`}>
                    <Edit className="w-4 h-4 mr-2" />Edit Profil
                  </Button>
                  {/* Removed beasiswa button - no longer using complex beasiswa workflow */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-to-b from-muted/10 to-muted/30">
          <CardContent className="p-6 lg:p-8 flex items-center justify-center">
            <div className="relative">
              <div className="w-40 h-40 rounded-full bg-primary/20 flex items-center justify-center">
                <Avatar className="w-36 h-36">
                  <AvatarImage 
                    src={getSafeAvatarUrl(santri?.foto_profil)} 
                    alt={santri?.nama_lengkap || santriName || "Santri"} 
                  />
                  <AvatarFallback>
                    {(santri?.nama_lengkap || santriName || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-b from-background to-muted/20 border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{totalDistribusiQty}</div>
              <div className="text-xs text-muted-foreground mt-1">Total item barang diterima</div>
            </div>
            <Boxes className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        {/* Removed beasiswa stat cards - no longer using complex beasiswa workflow */}
      </div>

      {/* Removed beasiswa-related alert - no longer using complex beasiswa workflow */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="info">📋 Informasi</TabsTrigger>
          <TabsTrigger value="hak">Hak & Bantuan</TabsTrigger>
          <TabsTrigger value="tabungan">Tabungan</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="dokumen">📄 Dokumen</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informasi Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                    <p className="text-sm">{santri?.nama_lengkap || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID Santri</label>
                    <p className="text-sm">{santri?.id_santri || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tempat, Tanggal Lahir</label>
                    <p className="text-sm">
                      {santri?.tempat_lahir || '-'}, {santri?.tanggal_lahir ? formatDate(santri.tanggal_lahir) : '-'}
                      {santri?.tanggal_lahir && (
                        <span className="text-muted-foreground ml-1">({calculateAge(santri.tanggal_lahir)} tahun)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Jenis Kelamin</label>
                    <p className="text-sm">{santri?.jenis_kelamin || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Agama</label>
                    <p className="text-sm">{santri?.agama || 'Islam'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status Anak</label>
                    <p className="text-sm">{santri?.status_anak || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Alamat</label>
                  <p className="text-sm">{santri?.alamat || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nomor WhatsApp</label>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {santri?.no_whatsapp || '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Administrative Information */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Data Administrasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Kategori Santri</label>
                    <p className="text-sm">{santri?.kategori || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Angkatan</label>
                    <p className="text-sm">{santri?.angkatan || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tanggal Masuk</label>
                    <p className="text-sm">{santri?.tanggal_masuk ? formatDate(santri.tanggal_masuk) : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status Santri</label>
                    <Badge variant={santri?.status_santri === 'Aktif' ? 'default' : 'secondary'}>
                      {santri?.status_santri || '-'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipe Pembayaran</label>
                    <p className="text-sm">{santri?.tipe_pembayaran || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wali Information */}
            {waliData.length > 0 && (
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Data Wali
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {waliData.map((wali, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">
                            {wali.is_utama ? 'Wali Utama' : `Wali ${index + 1}`}
                          </h4>
                          {wali.is_utama && (
                            <Badge variant="default" className="text-xs">Utama</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Nama:</span> {wali.nama_lengkap}
                          </div>
                          <div>
                            <span className="font-medium">Hubungan:</span> {wali.hubungan_keluarga}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{wali.no_whatsapp}</span>
                          </div>
                          {wali.pekerjaan && (
                            <div>
                              <span className="font-medium">Pekerjaan:</span> {wali.pekerjaan}
                            </div>
                          )}
                          {wali.penghasilan_bulanan && (
                            <div>
                              <span className="font-medium">Penghasilan:</span> {formatRupiah(wali.penghasilan_bulanan)}
                            </div>
                          )}
                          {wali.alamat && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3 h-3 mt-0.5" />
                              <span className="text-xs">{wali.alamat}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Program Information */}
            {programData.length > 0 && (
              <Card className="border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Program Pendidikan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {programData.map((program, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Program:</span> {program.nama_program || program.program?.nama_program || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Kelas:</span> {program.kelas_program || '-'}
                          </div>
                          {program.rombel && (
                            <div>
                              <span className="font-medium">Rombel:</span> {program.rombel}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hak">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Distribusi Barang */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5" />
                  Distribusi Barang
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Memuat...</div>
                ) : distribusi.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Belum ada distribusi</div>
                ) : (
                  distribusi.map((d) => (
                    <div key={d.id} className="p-3 rounded-md border flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.item_nama}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(d.tanggal)}</div>
                        {d.catatan && <div className="text-xs text-muted-foreground mt-1">{d.catatan}</div>}
                      </div>
                      <Badge variant="outline">{d.jumlah} {d.satuan || "pcs"}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Removed beasiswa content - no longer using complex beasiswa workflow */}

            {/* Bantuan Yayasan */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-blue-600" />
                  Bantuan Yayasan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {santri?.id_santri ? (
                  <BantuanYayasanTab 
                    santriIdSantri={santri.id_santri}
                    santriNisn={santri.nisn || ''}
                  />
                ) : (
                  <div className="text-center py-6">
                    <div className="text-sm text-muted-foreground">
                      ID Santri tidak tersedia
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tagihan">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tagihan Bulanan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <div className="text-lg font-semibold text-muted-foreground mb-2">
                    📋 Sistem Tagihan
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Informasi tagihan dan pembayaran untuk santri reguler
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fitur tagihan sedang dalam pengembangan
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Riwayat Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <div className="text-lg font-semibold text-muted-foreground mb-2">
                    💳 Riwayat Pembayaran
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Catatan pembayaran SPP dan biaya lainnya
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Data riwayat pembayaran akan ditampilkan di sini
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dokumen">
          {santriId && santri ? (
            <DokumenSantriTab 
              santriId={santriId} 
              santriData={{
                status_sosial: santri.status_sosial,
                nama_lengkap: santri.nama_lengkap
              }}
              isBantuanRecipient={isBantuanRecipient}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-muted-foreground text-sm">
                Memuat data santri...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tabungan">
          {santriId && santriName ? (
            <div className="space-y-6">
              <TabunganSantriCard
                santriId={santriId}
                santriName={santriName}
                isAdmin={true}
                onRefresh={() => {
                  // Refresh data if needed
                  console.log('Tabungan refreshed');
                }}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-muted-foreground text-sm">
                Memuat data santri...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">Placeholder Monitoring (belum tersedia)</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Removed beasiswa form - no longer using complex beasiswa workflow */}
    </div>
  );
};

export default SantriProfile;


