import { useEffect, useState, useMemo } from "react";
import { Outlet, useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  ArrowLeft,
  User,
  GraduationCap,
  FileText,
  Edit,
  DollarSign,
  CheckCircle,
  BookOpen,
  Wallet,
  HeartHandshake,
  Settings,
  LogOut,
  Camera,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { cn } from "@/lib/utils";
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { AkademikSemesterService } from '@/services/akademikSemester.service';
import { TagihanService } from '@/services/tagihan.service';
import SettingsPanel from "@/components/SettingsPanel";
import { toast } from 'sonner';
import SantriProgressTracking from "@/components/SantriProgressTracking";

interface SantriDataLocal {
  id: string;
  id_santri?: string;
  nama_lengkap: string;
  kategori?: string;
  status_santri?: string;
  foto_profil?: string;
}

interface ProgramAktif {
  id: string;
  nama_kelas: string;
  program: string;
}

interface FinancialSummary {
  total_bantuan_yayasan?: number;
  sisa_spp?: number;
  total_spp?: number;
  total_dibayar?: number;
}

const ProfileLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const santriId = id;
  const isCurrentUserSantri = user?.role === 'santri';
  const isViewingOwnProfile = isCurrentUserSantri && user?.santriId === santriId;

  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriDataLocal | null>(null);
  const [programAktif, setProgramAktif] = useState<ProgramAktif[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({});
  const [hafalanProgress, setHafalanProgress] = useState<{
    juz: number;
    progress: number;
    changeThisMonth: number;
  }>({ juz: 0, progress: 0, changeThisMonth: 0 });
  const [kehadiranProgress, setKehadiranProgress] = useState<{
    persentase: number;
    hadir: number;
    total: number;
  }>({ persentase: 0, hadir: 0, total: 0 });
  const [saldoTabungan, setSaldoTabungan] = useState<number>(0);
  const [loadingTabungan, setLoadingTabungan] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Memoize isBinaanMukim to avoid recalculation
  const isBinaanMukim = useMemo(() => {
    return santri?.kategori?.includes('Binaan Mukim') || 
           santri?.kategori === 'Santri Binaan Mukim' || false;
  }, [santri?.kategori]);

  // Load all data
  useEffect(() => {
    if (!santriId) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      if (!santriId) return;

      setLoading(true);
      try {
        // Load santri data
        const { data: santriData, error: santriError } = await supabase
          .from('santri')
          .select('*')
          .eq('id', santriId)
          .single();

        if (santriError) throw santriError;
        
        // If foto_profil is a relative path, generate public URL
        if (santriData?.foto_profil && !santriData.foto_profil.startsWith('http') && !santriData.foto_profil.startsWith('data:')) {
          try {
            // Determine bucket and path
            const bucketName = 'santri-documents';
            const photoPath = santriData.foto_profil;
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(photoPath);
            
            // Update santriData with public URL for display
            if (publicUrl) {
              santriData.foto_profil = publicUrl;
            }
          } catch (error) {
            // Silently fail - foto will not display but won't break the page
            // Error is non-critical, user can still use the profile
          }
        }
        
        setSantri(santriData);

        // Load program aktif from santri_kelas
        try {
          const { data: programData, error: programError } = await supabase
            .from('santri_kelas')
            .select(`
              id,
              nama_kelas,
              rumpun_kelas,
              kelas_program,
              status_kelas
            `)
            .eq('santri_id', santriId)
            .eq('aktif', true)
            .eq('status_kelas', 'Aktif');

          if (!programError && programData && programData.length > 0) {
            // Map santri_kelas to ProgramAktif format
            const mappedPrograms: ProgramAktif[] = programData.map(item => ({
              id: item.id,
              nama_kelas: item.nama_kelas || item.kelas_program || '',
              program: item.rumpun_kelas || item.kelas_program || ''
            }));
            setProgramAktif(mappedPrograms);
          } else {
            // No active programs found or query failed - set empty array
            setProgramAktif([]);
          }
        } catch (error) {
          // Silently handle error - programs are optional data
          setProgramAktif([]);
        }

        // Load financial summary based on kategori
        const isBinaanMukimLocal = santriData?.kategori?.includes('Binaan Mukim') || 
                                   santriData?.kategori === 'Santri Binaan Mukim';
        
        if (isBinaanMukimLocal) {
          // For Binaan Mukim: Load from alokasi_pengeluaran_santri
          try {
            const { data: alokasiData } = await supabase
              .from('alokasi_pengeluaran_santri')
              .select('nominal_alokasi')
              .eq('santri_id', santriId);
            
            const totalBantuan = alokasiData?.reduce((sum, item) => 
              sum + (Number(item.nominal_alokasi) || 0), 0
            ) || 0;
            
            setFinancialSummary({
              total_bantuan_yayasan: totalBantuan
            });
          } catch (error) {
            // Error loading financial summary - set empty to prevent UI breakage
            setFinancialSummary({});
          }
        } else {
          // For Reguler: Load from tagihan
          try {
            const tagihan = await TagihanService.getTagihan({ santri_id: santriId });
            const totalSpp = tagihan?.reduce((sum, t) => 
              sum + (Number(t.total_tagihan) || 0), 0
            ) || 0;
            const totalDibayar = tagihan?.reduce((sum, t) => 
              sum + (Number(t.total_bayar) || 0), 0
            ) || 0;
            const sisaSpp = Math.max(0, totalSpp - totalDibayar); // Ensure non-negative
            
            setFinancialSummary({
              total_spp: totalSpp,
              total_dibayar: totalDibayar,
              sisa_spp: sisaSpp
            });
          } catch (error) {
            // Error loading tagihan - set empty to prevent UI breakage
            setFinancialSummary({});
          }
        }

        // Load hafalan progress - calculate from setoran_harian
        const semester = await AkademikSemesterService.getSemesterAktif();
        if (semester) {
          try {
            // Get latest juz from setoran_harian for Tahfid program
            const { data: latestSetoran } = await supabase
              .from('setoran_harian')
              .select('juz')
              .eq('santri_id', santriId)
              .eq('program', 'Tahfid')
              .in('status', ['Sudah Setor', 'Hadir'])
              .not('juz', 'is', null)
              .order('tanggal_setor', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const currentJuz = latestSetoran?.juz || 0;
            const progress = currentJuz > 0 ? Math.round((currentJuz / 30) * 100 * 100) / 100 : 0;
            
            // Calculate change this month
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const { data: setoranThisMonth } = await supabase
              .from('setoran_harian')
              .select('juz')
              .eq('santri_id', santriId)
              .eq('program', 'Tahfid')
              .in('status', ['Sudah Setor', 'Hadir'])
              .gte('tanggal_setor', firstDayOfMonth.toISOString().split('T')[0])
              .not('juz', 'is', null)
              .order('juz', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const juzThisMonth = setoranThisMonth?.juz || 0;
            const changeThisMonth = Math.max(0, currentJuz - juzThisMonth);
            
            setHafalanProgress({
              juz: currentJuz,
              progress: progress,
              changeThisMonth: changeThisMonth
            });
          } catch (error) {
            // Error loading hafalan progress - set defaults
            setHafalanProgress({ juz: 0, progress: 0, changeThisMonth: 0 });
          }
        }

        // Load kehadiran progress - calculate from setoran_harian
        try {
          const { data: setoranData } = await supabase
            .from('setoran_harian')
            .select('status')
            .eq('santri_id', santriId);
          
          const total = setoranData?.length || 0;
          const hadir = setoranData?.filter(s => 
            s.status === 'Sudah Setor' || s.status === 'Hadir'
          ).length || 0;
          const persentase = total > 0 ? Math.round((hadir / total) * 100 * 100) / 100 : 0;
          
          setKehadiranProgress({
            persentase: persentase,
            hadir: hadir,
            total: total
          });
        } catch (error) {
          // Error loading kehadiran progress - set defaults
          setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
        }

        // Load tabungan saldo
        await loadTabunganSaldo(santriId);
      } catch (error: unknown) {
        // Log error for debugging but don't break the UI
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Gagal memuat data profil. Silakan refresh halaman.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [santriId]);

  const loadTabunganSaldo = async (id: string) => {
    try {
      setLoadingTabungan(true);
      // Calculate from all transactions (same logic as TabunganPage)
      const { data: allTx, error: txError } = await supabase
        .from('santri_tabungan')
        .select('jenis, nominal, saldo_sesudah')
        .eq('santri_id', id)
        .order('tanggal', { ascending: false });
      
      if (txError) {
        // Try RPC as fallback
        try {
          const saldo = await TabunganSantriService.getSaldoTabungan(id);
          setSaldoTabungan(saldo || 0);
        } catch (rpcError) {
          // Both methods failed - set to 0
          setSaldoTabungan(0);
        }
        return;
      }
      
      if (allTx && allTx.length > 0) {
        // Use latest transaction's saldo_sesudah if available (most accurate)
        const latestTx = allTx[0];
        if (latestTx.saldo_sesudah !== undefined && latestTx.saldo_sesudah !== null) {
          setSaldoTabungan(latestTx.saldo_sesudah);
        } else {
          // Calculate from all transactions (same as TabunganPage)
          // Only count approved/completed transactions
          const calculated = allTx.reduce((acc, t) => {
            const nominal = Number(t.nominal) || 0;
            if (t.jenis === 'Setoran') {
              return acc + nominal;
            } else if (t.jenis === 'Penarikan') {
              return acc - nominal;
            }
            return acc;
          }, 0);
          setSaldoTabungan(Math.max(0, calculated)); // Ensure non-negative
        }
      } else {
        setSaldoTabungan(0);
      }
    } catch (error) {
      // Error loading saldo - set to 0 to prevent UI breakage
      setSaldoTabungan(0);
    } finally {
      setLoadingTabungan(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !santriId) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File terlalu besar. Maksimal 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPG atau PNG.');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Preview foto
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setPhotoPreview(result);
        }
      };
      reader.onerror = () => {
        toast.error('Gagal membaca file foto');
      };
      reader.readAsDataURL(file);

      // Upload ke storage - use consistent path structure
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${santriId}/${fileName}`; // Path structure: {santriId}/{timestamp}.{ext}

      // Delete old photo if exists (non-blocking)
      if (santri?.foto_profil && !santri.foto_profil.startsWith('http') && !santri.foto_profil.startsWith('data:')) {
        try {
          // Extract path from relative path stored in database
          const pathParts = santri.foto_profil.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const oldPath = santri.foto_profil.startsWith('santri/')
            ? santri.foto_profil
            : `santri/${santriId}/photos/${fileName || ''}`;
          await supabase.storage
            .from('santri-documents')
            .remove([oldPath]);
        } catch (err) {
          // Silently fail - old photo cleanup is non-critical
        }
      }

      // Use santri-documents bucket (same as dokumen) since it's guaranteed to exist
      // Store photos in a 'photos' subfolder to keep them separate from documents
      const photoPath = `santri/${santriId}/photos/${fileName}`;
      const bucketName = 'santri-documents';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(photoPath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        const errorMessage = uploadError.message?.toLowerCase() || '';
        const isBucketNotFound = 
          errorMessage.includes('bucket') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('400');
        
        if (isBucketNotFound) {
          throw new Error('Bucket storage "santri-documents" tidak ditemukan. Silakan hubungi administrator untuk membuat bucket ini di Supabase Storage.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(photoPath);

      // Update database - use photoPath (relative path), not publicUrl
      const { error: updateError } = await supabase
        .from('santri')
        .update({ foto_profil: photoPath })
        .eq('id', santriId);

      if (updateError) throw updateError;

      // Update local state with publicUrl for immediate display
      if (santri) {
        setSantri({ ...santri, foto_profil: publicUrl });
      }
      // Clear photoPreview so it uses santri.foto_profil (which now has publicUrl)
      setPhotoPreview(null);
      toast.success('Foto profil berhasil diupdate');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Terjadi kesalahan saat mengupload foto';
      toast.error(errorMessage);
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Redirect santri if trying to access other santri's profile
  useEffect(() => {
    if (isCurrentUserSantri && santriId && user?.santriId && user.santriId !== santriId) {
      navigate(`/santri/profile/${user.santriId}`, { replace: true });
    } else if (isCurrentUserSantri && !user?.santriId) {
      navigate('/auth', { replace: true });
    }
  }, [isCurrentUserSantri, santriId, user?.santriId, navigate]);

  if (!santriId) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-xl font-bold text-red-600">ID Santri Tidak Ditemukan</div>
              {!isViewingOwnProfile && (
                <Button onClick={() => navigate('/santri')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Data Santri
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // isBinaanMukim is already memoized above

  // Header Component
  const HeaderCard = () => (
    <div className="bg-gradient-to-b from-emerald-50 via-white to-white pt-12 pb-16 px-6">
      <div className="flex justify-between items-center mb-12">
        <button 
          onClick={() => !isViewingOwnProfile ? navigate('/santri') : undefined}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          {isViewingOwnProfile && (
            <button
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  // Even if logout fails, redirect to auth page
                } finally {
                  setTimeout(() => window.location.replace('/auth'), 100);
                }
              }}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowSettingsPanel(true)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <div className="relative">
            <img
              src={photoPreview || getSafeAvatarUrl(santri?.foto_profil) || ''}
              alt={santri?.nama_lengkap || "Santri"}
              className="w-28 h-28 rounded-full border-[3px] border-amber-700/30 object-cover bg-white shadow-sm"
              onError={(e) => {
                const target = e.target;
                if (target instanceof HTMLImageElement) {
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling;
                  if (fallback instanceof HTMLElement) {
                    fallback.style.display = 'flex';
                  }
                }
              }}
            />
            <div 
              className="w-28 h-28 rounded-full border-[3px] border-amber-700/30 bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-amber-800 text-2xl font-semibold hidden shadow-sm"
            >
              {(santri?.nama_lengkap || 'S')
                .split(' ')
                .filter((n: string) => n.length > 0)
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <button
              onClick={() => document.getElementById('photo-upload-input')?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white hover:bg-gray-50 border border-amber-700/20 shadow-sm flex items-center justify-center transition-colors"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-amber-700" />
              )}
            </button>
            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-light text-gray-900 tracking-tight">
            {santri?.nama_lengkap || 'Memuat...'}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettingsPanel(true)}
            className="h-8 w-8 p-0"
            title="Edit Profil"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs font-medium text-amber-700 tracking-wider mb-2">
          ID: {santri?.id_santri || santriId?.slice(0, 8) || 'N/A'}
        </div>

        <div className="text-[11px] font-light text-gray-500 text-center mb-8 leading-relaxed px-4">
          {(() => {
            const status = santri?.status_santri || 'Tidak Diketahui';
            const kategori = santri?.kategori;
            const programCount = programAktif.length;
            
            const firstProgram = programAktif.find(p => p.nama_kelas && p.nama_kelas !== '-') || 
                                programAktif.find(p => p.program && p.program !== '-');
            const programName = firstProgram?.nama_kelas || firstProgram?.program;
            
            let statusText = `Status: ${status}`;
            
            if (kategori && kategori.includes('Binaan Mukim')) {
              statusText += ` • ${kategori}`;
            }
            
            if (programCount > 0) {
              if (programName && programName !== '-') {
                statusText += ` • Program: ${programName} (${programCount} aktif)`;
              } else {
                statusText += ` • Program: ${programCount} aktif`;
              }
            } else {
              statusText += ` • Program: 0 aktif`;
            }
            
            return statusText;
          })()}
        </div>
      </div>
    </div>
  );

  // KPI Cards Component
  const KPICards = () => {
    const kpiItems = useMemo(() => {
      const items = [
        {
          title: 'Progres Hafalan',
          value: hafalanProgress.juz > 0 ? `${hafalanProgress.juz}` : '0',
          subtitle: '/ 30 Juz',
          progress: hafalanProgress.progress,
          icon: BookOpen,
          color: 'text-emerald-600',
          bgGradient: 'from-emerald-50 to-emerald-100/50',
          borderColor: 'border-emerald-200'
        },
        {
          title: 'Kehadiran',
          value: `${kehadiranProgress.persentase}%`,
          subtitle: `${kehadiranProgress.hadir}/${kehadiranProgress.total} pertemuan`,
          progress: kehadiranProgress.persentase,
          icon: CheckCircle,
          color: 'text-blue-600',
          bgGradient: 'from-blue-50 to-blue-100/50',
          borderColor: 'border-blue-200'
        },
        {
          title: isBinaanMukim ? 'Layanan Diterima' : 'Sisa Tagihan',
          value: isBinaanMukim
            ? formatRupiah(financialSummary.total_bantuan_yayasan || 0)
            : formatRupiah(financialSummary.sisa_spp || 0),
          subtitle: isBinaanMukim
            ? 'Total layanan diterima'
            : (financialSummary.sisa_spp || 0) === 0 ? 'Semua tagihan lunas' : 'Perlu dibayar',
          progress: isBinaanMukim ? 100 : 
            financialSummary.total_spp ? ((financialSummary.total_dibayar || 0) / financialSummary.total_spp) * 100 : 0,
          icon: DollarSign,
          color: 'text-amber-700',
          bgGradient: 'from-amber-50 to-amber-100/50',
          borderColor: 'border-amber-200',
          onClick: isBinaanMukim ? () => navigate(`/santri/profile/${santriId}/layanan`) : undefined
        },
        {
          title: 'Tabungan Santri',
          value: formatRupiah(saldoTabungan || 0),
          subtitle: 'Saldo tabungan saat ini',
          progress: (saldoTabungan || 0) > 0 ? 100 : 0,
          icon: Wallet,
          color: 'text-emerald-600',
          bgGradient: 'from-emerald-50 to-emerald-100/50',
          borderColor: 'border-emerald-200',
          onClick: () => navigate(`/santri/profile/${santriId}/tabungan`)
        }
      ];
      return items;
    }, [hafalanProgress, kehadiranProgress, financialSummary, santri, saldoTabungan, isBinaanMukim, santriId, navigate]);

    return (
      <div className="px-4 -mt-8 mb-6 relative z-10">
        <Carousel 
          opts={{ 
            align: "start",
            loop: false,
            dragFree: true,
          }} 
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {kpiItems.map((item, index) => {
              const Icon = item.icon;
              const CardComponent = item.onClick ? 'button' : 'div';
              return (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-[75%] sm:basis-[60%] md:basis-[38%] lg:basis-[28%]">
                  <CardComponent
                    onClick={item.onClick}
                    className={cn(
                      `bg-gradient-to-br ${item.bgGradient} border ${item.borderColor} rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 h-full min-h-[130px] flex flex-col w-full`,
                      item.onClick && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg bg-white/60 backdrop-blur-sm ${item.color} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-light text-gray-500 uppercase tracking-widest mb-1">
                          {item.title}
                        </div>
                        <div className={`text-xl font-semibold ${item.color} tracking-tight leading-tight mb-0.5`}>
                          {item.value}
                        </div>
                        {item.subtitle && (
                          <div className="text-[10px] font-light text-gray-500 leading-tight truncate">
                            {item.subtitle}
                          </div>
                        )}
                        {item.progress > 0 && (
                          <div className="mt-2">
                            <div className="h-1 bg-white/70 rounded-full overflow-hidden">
                              <div 
                                className="h-full transition-all duration-500 opacity-60"
                                style={{ 
                                  width: `${item.progress}%`,
                                  backgroundColor: item.color === 'text-emerald-600' ? 'rgb(5, 150, 105)' :
                                                  item.color === 'text-blue-600' ? 'rgb(37, 99, 235)' :
                                                  item.color === 'text-amber-700' ? 'rgb(180, 83, 9)' :
                                                  item.color === 'text-purple-600' ? 'rgb(147, 51, 234)' : 'rgb(107, 114, 128)'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {item.progress > 0 && (
                        <div className="text-[10px] font-light text-gray-500 flex-shrink-0">
                          {item.progress.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </CardComponent>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-1 bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white shadow-sm w-7 h-7" />
          <CarouselNext className="right-1 bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white shadow-sm w-7 h-7" />
        </Carousel>
      </div>
    );
  };

  // Action Grid Component (Quick Actions)
  const ActionGrid = () => {
    const actions = [
      {
        id: 'tabungan',
        label: 'Tabungan',
        icon: Wallet,
        path: `/santri/profile/${santriId}/tabungan`
      },
      {
        id: 'akademik',
        label: 'Akademik',
        icon: GraduationCap,
        path: `/santri/profile/${santriId}/akademik`
      },
      ...(isBinaanMukim ? [{
        id: 'layanan',
        label: 'Layanan',
        icon: HeartHandshake,
        path: `/santri/profile/${santriId}/layanan`
      }] : [{
        id: 'tagihan',
        label: 'Tagihan',
        icon: DollarSign,
        path: `/santri/profile/${santriId}/keuangan`
      }]),
      {
        id: 'dokumen',
        label: 'Dokumen',
        icon: FileText,
        path: `/santri/profile/${santriId}/dokumen`
      },
    ];

    return (
      <div className="px-6 py-8">
        <div className="grid grid-cols-4 gap-8">
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = location.pathname === action.path;
            return (
              <Link
                key={action.id}
                to={action.path}
                className={cn(
                  "flex flex-col items-center gap-3 group",
                  isActive && "text-primary"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6 text-emerald-600 group-hover:text-emerald-700 transition-colors",
                  isActive && "text-primary"
                )} />
                <span className="text-[11px] font-light text-gray-600 text-center leading-tight tracking-wide">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat data santri...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans pb-20 overflow-x-hidden max-w-full" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <HeaderCard />
      <KPICards />
      <ActionGrid />

      <div className="container mx-auto px-4 pb-20 md:pb-8 max-w-full overflow-x-hidden">
        <Outlet context={{ santri, santriId, programAktif, financialSummary, hafalanProgress, kehadiranProgress, saldoTabungan }} />
      </div>

      <SettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        title="Pengaturan"
        menuItems={{
          account: [
            {
              icon: <User className="h-5 w-5" />,
              title: "Profil",
              subtitle: "Kelola data santri",
              onClick: () => {
                navigate(`/santri/profile/${santriId}/informasi`);
                setShowSettingsPanel(false);
              },
            },
            {
              icon: <Settings className="h-5 w-5" />,
              title: "Keamanan",
              subtitle: "Kata sandi & akses",
              onClick: () => {
                navigate('/change-password');
                setShowSettingsPanel(false);
              },
            },
          ],
          preferences: [
            {
              icon: <FileText className="h-5 w-5" />,
              title: "Dokumen",
              subtitle: "Kelola dokumen santri",
              onClick: () => {
                navigate(`/santri/profile/${santriId}/dokumen`);
                setShowSettingsPanel(false);
              },
            },
          ],
        }}
      />
    </div>
  );
};

export default ProfileLayout;

