// Approval Service - Consistent naming standard
// Service for handling santri approval workflow

import { supabase } from '@/integrations/supabase/client';
import { ApprovalSantriData, StatusApproval } from '@/types/santri.types';

export class ApprovalService {
  /**
   * Get all santri pending approval
   */
  static async getPendingApprovals(): Promise<ApprovalSantriData[]> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select(`
          *,
          wali:santri_wali(*)
        `)
        .eq('status_approval', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get dokumen count for each santri
      const santriWithDokumen = await Promise.all(
        (data || []).map(async (santri) => {
          const { data: dokumen, error: dokumenError } = await supabase
            .from('dokumen_santri')
            .select('id, status_verifikasi')
            .eq('santri_id', santri.id);

          if (dokumenError) {
            console.error('Error fetching dokumen:', dokumenError);
          }

          const dokumenCount = {
            total: dokumen?.length || 0,
            verified: dokumen?.filter(d => d.status_verifikasi === 'Diverifikasi').length || 0,
            pending: dokumen?.filter(d => d.status_verifikasi === 'Belum Diverifikasi').length || 0,
          };

          // Get bantuan auto-calculation for Binaan
          let bantuan_auto = undefined;
          if (santri.kategori?.includes('Binaan')) {
            bantuan_auto = await this.calculateAutoBantuan(santri);
          }

          return {
            ...santri,
            dokumen_count: dokumenCount,
            bantuan_auto,
          };
        })
      );

      return santriWithDokumen;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  /**
   * Get santri by ID for approval review
   */
  static async getSantriForApproval(santriId: string): Promise<ApprovalSantriData | null> {
    try {
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select(`
          *,
          wali:santri_wali(*)
        `)
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;
      if (!santri) return null;

      // Get dokumen count
      const { data: dokumen, error: dokumenError } = await supabase
        .from('dokumen_santri')
        .select('id, status_verifikasi')
        .eq('santri_id', santriId);

      if (dokumenError) {
        console.error('Error fetching dokumen:', dokumenError);
      }

      const dokumenCount = {
        total: dokumen?.length || 0,
        verified: dokumen?.filter(d => d.status_verifikasi === 'Diverifikasi').length || 0,
        pending: dokumen?.filter(d => d.status_verifikasi === 'Belum Diverifikasi').length || 0,
      };

      // Get bantuan auto-calculation for Binaan
      let bantuan_auto = undefined;
      if (santri.kategori?.includes('Binaan')) {
        bantuan_auto = await this.calculateAutoBantuan(santri);
      }

      return {
        ...santri,
        dokumen_count: dokumenCount,
        bantuan_auto,
      };
    } catch (error) {
      console.error('Error getting santri for approval:', error);
      throw error;
    }
  }

  /**
   * Calculate auto bantuan based on kategori and status_sosial
   */
  private static async calculateAutoBantuan(santri: any) {
    const kategori = santri.kategori;
    const statusSosial = santri.status_sosial;

    // Default bundling based on kategori and status_sosial
    let bundling: any = {};
    let totalNominal = 0;

    if (kategori === 'Binaan Mukim') {
      // Full bundling for Binaan Mukim
      bundling = {
        pendidikan: { cover: 100, nominal: 500000, bentuk: 'pelayanan' },
        asrama: { cover: 100, nominal: 400000, bentuk: 'pelayanan' },
        konsumsi: { cover: 100, nominal: 450000, bentuk: 'barang' },
        kesehatan: { cover: 100, nominal: 100000, bentuk: 'pelayanan' },
        uang_saku: { enabled: true, nominal: 150000 },
      };

      // Adjust based on status_sosial
      if (statusSosial === 'Yatim Piatu') {
        bundling.uang_saku.nominal = 200000; // Extra for Yatim Piatu
      }

      totalNominal = 
        bundling.pendidikan.nominal +
        bundling.asrama.nominal +
        bundling.konsumsi.nominal +
        bundling.kesehatan.nominal +
        (bundling.uang_saku.enabled ? bundling.uang_saku.nominal : 0);

    } else if (kategori === 'Binaan Non-Mukim') {
      // Education only for Binaan Non-Mukim
      bundling = {
        pendidikan: { cover: 100, nominal: 500000, bentuk: 'pelayanan' },
        transport: { cover: 50, nominal: 100000, bentuk: 'uang' },
        uang_saku: { enabled: false, nominal: 0 },
      };

      totalNominal = 
        bundling.pendidikan.nominal +
        bundling.transport.nominal;
    }

    return {
      template_id: null, // Will be set when template system is implemented
      template_name: `${kategori} - ${statusSosial}`,
      bundling,
      total_nominal: totalNominal,
    };
  }

  /**
   * Approve santri
   */
  static async approveSantri(
    santriId: string,
    userId: string,
    catatanApproval?: string,
    customBundling?: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update santri status
      const { error: updateError } = await supabase
        .from('santri')
        .update({
          status_approval: 'disetujui',
          approved_at: new Date().toISOString(),
          approved_by: user?.id || userId,
          catatan_approval: catatanApproval || null,
        })
        .eq('id', santriId);

      if (updateError) throw updateError;

      // Get santri data
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;

      // If Binaan, create bantuan_aktif_santri
      if (santri.kategori?.includes('Binaan')) {
        const bantuanData = customBundling || (await this.calculateAutoBantuan(santri));
        
        const { error: bantuanError } = await supabase
          .from('bantuan_aktif_santri')
          .insert({
            santri_id: santriId,
            jenis_bantuan: santri.status_sosial,
            komponen_bantuan: bantuanData.bundling,
            nominal_per_bulan: bantuanData.total_nominal,
            status: 'aktif',
            tanggal_mulai: new Date().toISOString(),
          });

        if (bantuanError) {
          console.error('Error creating bantuan_aktif_santri:', bantuanError);
          // Don't throw, approval should still succeed
        }
      }
    } catch (error) {
      console.error('Error approving santri:', error);
      throw error;
    }
  }

  /**
   * Reject santri
   */
  static async rejectSantri(
    santriId: string,
    userId: string,
    catatanPenolakan: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('santri')
        .update({
          status_approval: 'ditolak',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id || userId,
          catatan_penolakan: catatanPenolakan,
        })
        .eq('id', santriId);

      if (error) throw error;
    } catch (error) {
      console.error('Error rejecting santri:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats() {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('status_approval');

      if (error) throw error;

      const stats = {
        pending: data?.filter(s => s.status_approval === 'pending').length || 0,
        disetujui: data?.filter(s => s.status_approval === 'disetujui').length || 0,
        ditolak: data?.filter(s => s.status_approval === 'ditolak').length || 0,
        total: data?.length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting approval stats:', error);
      throw error;
    }
  }
}

