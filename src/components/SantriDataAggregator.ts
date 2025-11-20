// Santri Data Aggregator - Centralized data collection for santri profile
import { supabase } from "@/integrations/supabase/client";
import { ProfileHelper } from "@/utils/profile.helper";

export interface SantriFinancialSummary {
  total_beasiswa: number;
  total_tagihan: number;
  total_pembayaran: number;
  saldo_tabungan: number;
  hutang_bulanan: number;
  status_pembayaran: 'lunas' | 'sebagian' | 'belum_bayar';
}

export interface SantriAcademicSummary {
  program_aktif: number;
  total_program: number;
  prestasi_terbaru: any[];
  nilai_rata_rata: number;
  status_akademik: 'baik' | 'cukup' | 'perlu_perhatian';
}

export interface SantriBeasiswaSummary {
  total_beasiswa_aktif: number;
  nominal_per_bulan: number;
  jenis_beasiswa: string[];
  status_beasiswa: 'aktif' | 'suspend' | 'selesai';
  evaluasi_berikutnya: string | null;
}

export interface SantriDocumentSummary {
  dokumen_wajib_lengkap: number;
  dokumen_wajib_total: number;
  dokumen_opsional: number;
  status_verifikasi: 'lengkap' | 'sebagian' | 'belum_lengkap';
  dokumen_pending: any[];
  total_uploaded_documents: number;
  uploaded_required_documents: number;
  total_required_documents: number;
  is_complete: boolean;
}

export interface SantriWaliSummary {
  wali_utama: any | null;
  total_wali: number;
  kontak_utama: string | null;
  status_kontak: 'aktif' | 'tidak_aktif';
  wali_data: any[];
  has_utama_wali: boolean;
}

export class SantriDataAggregator {
  /**
   * Get comprehensive financial summary for a santri
   */
  static async getFinancialSummary(santriId: string): Promise<SantriFinancialSummary> {
    try {
      // Get beasiswa data from beasiswa_aktif_santri
      const { data: beasiswaData } = await supabase
        .from('beasiswa_aktif_santri')
        .select('nominal_per_bulan, status')
        .eq('santri_id', santriId)
        .eq('status', 'aktif');

      // Get beasiswa pembayaran data (manual payments)
      const { data: beasiswaPembayaranData } = await supabase
        .from('beasiswa_pembayaran')
        .select('nominal, status')
        .eq('santri_id', santriId)
        .eq('status', 'dibayar');

      // Get tagihan data
      const { data: tagihanData } = await supabase
        .from('tagihan_santri')
        .select('total_tagihan, total_bayar, status')
        .eq('santri_id', santriId);

      // Get pembayaran data
      const { data: pembayaranData } = await supabase
        .from('pembayaran_santri')
        .select('jumlah_bayar')
        .eq('santri_id', santriId);

      // Get tabungan data
      const { data: tabunganData } = await supabase
        .from('santri_tabungan')
        .select('saldo_sesudah')
        .eq('santri_id', santriId)
        .order('created_at', { ascending: false })
        .limit(1);

      const totalBeasiswaAktif = beasiswaData?.reduce((sum, item) => sum + (item.nominal_per_bulan || 0), 0) || 0;
      const totalBeasiswaPembayaran = beasiswaPembayaranData?.reduce((sum, item) => sum + (item.nominal || 0), 0) || 0;
      const totalBeasiswa = totalBeasiswaAktif + totalBeasiswaPembayaran;
      const totalTagihan = tagihanData?.reduce((sum, item) => sum + (item.total_tagihan || 0), 0) || 0;
      const totalPembayaran = pembayaranData?.reduce((sum, item) => sum + (item.jumlah_bayar || 0), 0) || 0;
      const saldoTabungan = tabunganData?.[0]?.saldo_sesudah || 0;

      // Calculate payment status
      let statusPembayaran: 'lunas' | 'sebagian' | 'belum_bayar' = 'belum_bayar';
      if (totalPembayaran >= totalTagihan && totalTagihan > 0) {
        statusPembayaran = 'lunas';
      } else if (totalPembayaran > 0) {
        statusPembayaran = 'sebagian';
      }

      const hutangBulanan = totalTagihan - totalPembayaran;

      return {
        total_beasiswa: totalBeasiswa,
        total_tagihan: totalTagihan,
        total_pembayaran: totalPembayaran,
        saldo_tabungan: saldoTabungan,
        hutang_bulanan: Math.max(0, hutangBulanan),
        status_pembayaran: statusPembayaran
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return {
        total_beasiswa: 0,
        total_tagihan: 0,
        total_pembayaran: 0,
        saldo_tabungan: 0,
        hutang_bulanan: 0,
        status_pembayaran: 'belum_bayar'
      };
    }
  }

  /**
   * Get comprehensive academic summary for a santri
   */
  static async getAcademicSummary(santriId: string): Promise<SantriAcademicSummary> {
    try {
      // Get program data
      const { data: programData } = await supabase
        .from('santri_kelas')
        .select(`
          *
        `)
        .eq('santri_id', santriId);

      // Get prestasi data (if available)
      const { data: prestasiData } = await supabase
        .from('pengajuan_beasiswa_santri')
        .select('prestasi_santri, status')
        .eq('santri_id', santriId)
        .order('created_at', { ascending: false })
        .limit(5);

      const programAktif = programData?.filter(p => p.aktif === true).length || 0;
      const totalProgram = programData?.length || 0;

      // Determine academic status based on program participation
      let statusAkademik: 'baik' | 'cukup' | 'perlu_perhatian' = 'baik';
      if (programAktif === 0) {
        statusAkademik = 'perlu_perhatian';
      } else if (programAktif < totalProgram) {
        statusAkademik = 'cukup';
      }

      return {
        program_aktif: programAktif,
        total_program: totalProgram,
        prestasi_terbaru: prestasiData || [],
        nilai_rata_rata: 0, // TODO: Implement when grade system is available
        status_akademik: statusAkademik
      };
    } catch (error) {
      console.error('Error getting academic summary:', error);
      return {
        program_aktif: 0,
        total_program: 0,
        prestasi_terbaru: [],
        nilai_rata_rata: 0,
        status_akademik: 'perlu_perhatian'
      };
    }
  }

  /**
   * Get comprehensive beasiswa summary for a santri
   */
  static async getBeasiswaSummary(santriId: string): Promise<SantriBeasiswaSummary> {
    try {
      const { data: beasiswaData } = await supabase
        .from('beasiswa_aktif_santri')
        .select('*')
        .eq('santri_id', santriId)
        .eq('status', 'aktif');

      const totalBeasiswaAktif = beasiswaData?.length || 0;
      const nominalPerBulan = beasiswaData?.reduce((sum, item) => sum + (item.nominal_per_bulan || 0), 0) || 0;
      const jenisBeasiswa = [...new Set(beasiswaData?.map(item => item.jenis_beasiswa) || [])];

      // Get next evaluation date
      const nextEvaluation = beasiswaData?.[0]?.tanggal_evaluasi_berikutnya || null;

      let statusBeasiswa: 'aktif' | 'suspend' | 'selesai' = 'aktif';
      if (totalBeasiswaAktif === 0) {
        statusBeasiswa = 'selesai';
      } else if (beasiswaData?.some(item => item.status === 'suspend')) {
        statusBeasiswa = 'suspend';
      }

      return {
        total_beasiswa_aktif: totalBeasiswaAktif,
        nominal_per_bulan: nominalPerBulan,
        jenis_beasiswa: jenisBeasiswa,
        status_beasiswa: statusBeasiswa,
        evaluasi_berikutnya: nextEvaluation
      };
    } catch (error) {
      console.error('Error getting beasiswa summary:', error);
      return {
        total_beasiswa_aktif: 0,
        nominal_per_bulan: 0,
        jenis_beasiswa: [],
        status_beasiswa: 'selesai',
        evaluasi_berikutnya: null
      };
    }
  }

  /**
   * Get comprehensive document summary for a santri
   */
  static async getDocumentSummary(santriId: string, kategoriSantri: string, statusSosial?: string): Promise<SantriDocumentSummary> {
    try {
      // Get required documents based on category
      const requiredDocs = ProfileHelper.getRequiredDocuments(kategoriSantri, statusSosial);
      
      // Get uploaded documents
      const { data: uploadedDocs } = await supabase
        .from('dokumen_santri')
        .select('*')
        .eq('santri_id', santriId);

      const dokumenWajibTotal = requiredDocs.length;
      const dokumenWajibLengkap = requiredDocs.filter(reqDoc => 
        uploadedDocs?.some(uploaded => uploaded.jenis_dokumen === reqDoc.jenis_dokumen)
      ).length;

      const dokumenOpsional = uploadedDocs?.filter(doc => 
        !requiredDocs.some(reqDoc => reqDoc.jenis_dokumen === doc.jenis_dokumen)
      ).length || 0;

      // Get pending verification documents
      const dokumenPending = uploadedDocs?.filter(doc => 
        doc.status_verifikasi === 'Belum Diverifikasi'
      ) || [];

      let statusVerifikasi: 'lengkap' | 'sebagian' | 'belum_lengkap' = 'belum_lengkap';
      if (dokumenWajibLengkap === dokumenWajibTotal) {
        statusVerifikasi = 'lengkap';
      } else if (dokumenWajibLengkap > 0) {
        statusVerifikasi = 'sebagian';
      }

      return {
        dokumen_wajib_lengkap: dokumenWajibLengkap,
        dokumen_wajib_total: dokumenWajibTotal,
        dokumen_opsional: dokumenOpsional,
        status_verifikasi: statusVerifikasi,
        dokumen_pending: dokumenPending,
        total_uploaded_documents: uploadedDocs?.length || 0,
        uploaded_required_documents: dokumenWajibLengkap,
        total_required_documents: dokumenWajibTotal,
        is_complete: dokumenWajibLengkap === dokumenWajibTotal
      };
    } catch (error) {
      console.error('Error getting document summary:', error);
      return {
        dokumen_wajib_lengkap: 0,
        dokumen_wajib_total: 0,
        dokumen_opsional: 0,
        status_verifikasi: 'belum_lengkap',
        dokumen_pending: [],
        total_uploaded_documents: 0,
        uploaded_required_documents: 0,
        total_required_documents: 0,
        is_complete: false
      };
    }
  }

  /**
   * Get comprehensive wali summary for a santri
   */
  static async getWaliSummary(santriId: string): Promise<SantriWaliSummary> {
    try {
      const { data: waliData } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId)
        .order('is_utama', { ascending: false });

      const waliUtama = waliData?.find(wali => wali.is_utama) || null;
      const totalWali = waliData?.length || 0;
      const kontakUtama = waliUtama?.no_whatsapp || waliData?.[0]?.no_whatsapp || null;

      // Determine contact status (simplified - could be enhanced with actual communication tracking)
      const statusKontak: 'aktif' | 'tidak_aktif' = kontakUtama ? 'aktif' : 'tidak_aktif';

      return {
        wali_utama: waliUtama,
        total_wali: totalWali,
        kontak_utama: kontakUtama,
        status_kontak: statusKontak,
        wali_data: waliData || [],
        has_utama_wali: !!waliUtama
      };
    } catch (error) {
      console.error('Error getting wali summary:', error);
      return {
        wali_utama: null,
        total_wali: 0,
        kontak_utama: null,
        status_kontak: 'tidak_aktif',
        wali_data: [],
        has_utama_wali: false
      };
    }
  }

  /**
   * Get comprehensive summary for all modules
   */
  static async getComprehensiveSummary(santriId: string, kategoriSantri: string, statusSosial?: string) {
    try {
      const [financial, academic, beasiswa, documents, wali] = await Promise.all([
        this.getFinancialSummary(santriId),
        this.getAcademicSummary(santriId),
        this.getBeasiswaSummary(santriId),
        this.getDocumentSummary(santriId, kategoriSantri, statusSosial),
        this.getWaliSummary(santriId)
      ]);

      return {
        financial,
        academic,
        beasiswa,
        documents,
        wali,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting comprehensive summary:', error);
      throw error;
    }
  }
}

export default SantriDataAggregator;

