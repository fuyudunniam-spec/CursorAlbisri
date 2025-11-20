// Dokumen Helper - For registration form
// Helper untuk manage dokumen requirements berdasarkan kategori

import { DokumenData } from '@/types/santri.types';

export class DokumenHelper {
  // Normalize various labels to strict DB enum values
  private static normalizeJenisDokumen(raw: string): string {
    const lower = (raw || '').toLowerCase().trim();
    if (lower.includes('ktp') && lower.includes('utama')) return 'KTP Wali Utama';
    if (lower.includes('ktp') && (lower.includes('pendamping') || lower.includes('wali'))) return 'KTP Wali Pendamping';
    if (lower.startsWith('sktm')) return 'SKTM';
    if (lower.includes('kartu keluarga') || lower === 'kk' || lower.includes('ktp/kk')) return 'Kartu Keluarga';
    if (lower.includes('pas foto') || lower.includes('foto')) return 'Pas Foto';
    if (lower.includes('akta kelahiran')) return 'Akta Kelahiran';
    if (lower.includes('ijazah')) return 'Ijazah Terakhir';
    if (lower.includes('transkrip')) return 'Transkrip Nilai';
    if (lower.includes('surat keterangan sehat')) return 'Surat Keterangan Sehat';
    if (lower.includes('akta kematian') && lower.includes('ayah')) return 'Akta Kematian Ayah';
    if (lower.includes('akta kematian') && lower.includes('ibu')) return 'Akta Kematian Ibu';
    return raw?.trim() || 'Dokumen';
  }
  /**
   * Get dokumen requirements untuk Reguler
   */
  static getDokumenReguler(): DokumenData[] {
    return [
      { jenis_dokumen: 'Pas Foto', label: '📷 Pas Foto', required: true },
      { jenis_dokumen: 'Kartu Keluarga', label: '👨‍👩‍👧‍👦 Kartu Keluarga (KK)', required: true },
      { jenis_dokumen: 'Akta Kelahiran', label: '📄 Akta Kelahiran', required: true },
      { jenis_dokumen: 'Ijazah Terakhir', label: '🎓 Ijazah Terakhir', required: false },
      { jenis_dokumen: 'Transkrip Nilai', label: '📊 Transkrip Nilai', required: false },
    ];
  }

  /**
   * Get dokumen requirements untuk Binaan Mukim berdasarkan Status Sosial
   */
  static getDokumenBinaanMukim(statusSosial: string): DokumenData[] {
    const baseDocs: DokumenData[] = [
      { jenis_dokumen: 'Pas Foto', label: '📷 Pas Foto', required: true },
      { jenis_dokumen: 'Kartu Keluarga', label: '👨‍👩‍👧‍👦 Kartu Keluarga (KK)', required: true },
      { jenis_dokumen: 'Akta Kelahiran', label: '📄 Akta Kelahiran', required: true },
      { jenis_dokumen: 'KTP Wali Utama', label: '🆔 KTP Wali Utama', required: true },
      { jenis_dokumen: 'KTP Wali Pendamping', label: '🆔 KTP Wali Pendamping', required: false },
      { jenis_dokumen: 'Ijazah Terakhir', label: '🎓 Ijazah Terakhir', required: true },
      { jenis_dokumen: 'Transkrip Nilai', label: '📊 Transkrip Nilai', required: true },
      { jenis_dokumen: 'Surat Keterangan Sehat', label: '🏥 Surat Keterangan Sehat', required: true },
    ];

    // Add specific docs based on status_sosial
    if (statusSosial === 'Yatim') {
      baseDocs.push({ jenis_dokumen: 'Akta Kematian Ayah', label: '⚰️ Akta Kematian Ayah', required: true });
    } else if (statusSosial === 'Piatu') {
      baseDocs.push({ jenis_dokumen: 'Akta Kematian Ibu', label: '⚰️ Akta Kematian Ibu', required: true });
    } else if (statusSosial === 'Yatim Piatu') {
      baseDocs.push({ jenis_dokumen: 'Akta Kematian Ayah', label: '⚰️ Akta Kematian Ayah', required: true });
      baseDocs.push({ jenis_dokumen: 'Akta Kematian Ibu', label: '⚰️ Akta Kematian Ibu', required: true });
    }

    if (statusSosial === 'Dhuafa' || statusSosial === 'Yatim' || statusSosial === 'Piatu' || statusSosial === 'Yatim Piatu') {
      baseDocs.push({
        jenis_dokumen: 'SKTM',
        label: '📋 Surat Keterangan Tidak Mampu (SKTM)',
        required: true
      });
    }

    // Add optional
    baseDocs.push({
      jenis_dokumen: 'Sertifikat Prestasi',
      label: '🏆 Sertifikat Prestasi',
      required: false
    });

    return baseDocs;
  }

  /**
   * Get dokumen requirements untuk Binaan Non-Mukim berdasarkan Status Sosial
   */
  static getDokumenBinaanNonMukim(statusSosial: string): DokumenData[] {
    const docs: DokumenData[] = [
      { jenis_dokumen: 'Pas Foto', label: '📷 Pas Foto', required: true },
      { jenis_dokumen: 'Kartu Keluarga', label: '👨‍👩‍👧‍👦 Kartu Keluarga (KK)', required: true },
      { jenis_dokumen: 'Akta Kelahiran', label: '📄 Akta Kelahiran', required: true },
      { jenis_dokumen: 'KTP Wali Utama', label: '🆔 KTP Wali Utama', required: true },
      { jenis_dokumen: 'KTP Wali Pendamping', label: '🆔 KTP Wali Pendamping', required: false },
    ];

    // Add specific docs based on status_sosial
    if (statusSosial === 'Yatim') {
      docs.push({ jenis_dokumen: 'Akta Kematian Ayah', label: '⚰️ Akta Kematian Ayah', required: true });
    } else if (statusSosial === 'Piatu') {
      docs.push({ jenis_dokumen: 'Akta Kematian Ibu', label: '⚰️ Akta Kematian Ibu', required: true });
    } else if (statusSosial === 'Yatim Piatu') {
      docs.push({ jenis_dokumen: 'Akta Kematian Ayah', label: '⚰️ Akta Kematian Ayah', required: true });
      docs.push({ jenis_dokumen: 'Akta Kematian Ibu', label: '⚰️ Akta Kematian Ibu', required: true });
    }

    if (statusSosial === 'Dhuafa' || statusSosial === 'Yatim' || statusSosial === 'Piatu' || statusSosial === 'Yatim Piatu') {
      docs.push({
        jenis_dokumen: 'SKTM',
        label: '📋 Surat Keterangan Tidak Mampu (SKTM)',
        required: true
      });
    }

    return docs;
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Ukuran file maksimal 10MB' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Format file tidak didukung. Gunakan JPG, PNG, PDF, atau DOC' };
    }

    return { valid: true };
  }

  /**
   * Upload dokumen to Supabase Storage
   */
  static async uploadDokumen(
    file: File,
    santriId: string,
    jenisDokumen: string,
    supabase: any
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const normalizedJenis = this.normalizeJenisDokumen(jenisDokumen);
      const filePath = `santri/${santriId}/${normalizedJenis}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('santri-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('dokumen_santri')
        .insert({
          santri_id: santriId,
          jenis_dokumen: normalizedJenis,
          nama_dokumen: normalizedJenis,
          nama_file: file.name,
          path_file: filePath,
          ukuran_file: file.size,
          tipe_file: file.type,
          status_verifikasi: 'Belum Diverifikasi',
          is_editable_by_santri: true,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to cleanup uploaded file
        await supabase.storage.from('santri-documents').remove([filePath]);
        return { success: false, error: dbError.message };
      }

      return { success: true, path: filePath };
    } catch (error: any) {
      console.error('Upload failed:', error);
      return { success: false, error: error.message };
    }
  }
}

