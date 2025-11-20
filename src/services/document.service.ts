import { supabase } from '@/integrations/supabase/client';

export interface DocumentRequirement {
  id: string;
  jenis_dokumen: string;
  kategori_santri: string;
  kategori_dokumen: 'Reguler' | 'Bantuan' | 'Optional';
  is_required: boolean;
  is_editable_by_santri: boolean;
  kondisi_required?: string;
  deskripsi?: string;
  urutan: number;
}

export interface DocumentFile {
  id?: string;
  santri_id: string;
  jenis_dokumen: string;
  nama_dokumen: string;
  nama_file?: string;
  path_file?: string;
  ukuran_file?: number;
  tipe_file?: string;
  status_verifikasi: 'Belum Diverifikasi' | 'Diverifikasi' | 'Ditolak';
  tanggal_verifikasi?: string;
  verifikasi_oleh?: string;
  catatan_verifikasi?: string;
  kategori_dokumen: 'Reguler' | 'Bantuan' | 'Optional';
  is_required: boolean;
  is_editable_by_santri: boolean;
  pengajuan_bantuan_id?: string;
  keterangan?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export class DocumentService {
  /**
   * Get document requirements based on santri category and status
   * @param kategoriSantri - Kategori santri (Reguler, Binaan Mukim, dll) atau 'ALL'
   * @param statusSosial - Status sosial (Yatim, Piatu, Yatim Piatu, Lengkap)
   * @param isBantuanRecipient - Apakah santri penerima bantuan
   */
  static async getDocumentRequirements(
    kategoriSantri: string = 'ALL',
    statusSosial?: string,
    isBantuanRecipient: boolean = false
  ): Promise<DocumentRequirement[]> {
    try {
      const { data, error } = await supabase
        .from('requirement_dokumen')
        .select('*')
        .or(`kategori_santri.eq.${kategoriSantri},kategori_santri.eq.ALL`)
        .order('urutan', { ascending: true });

      if (error) throw error;

      // Filter based on conditions
      return (data || []).filter(req => {
        // RULE 1: Regular documents - always include for all santri
        if (req.kategori_dokumen === 'Reguler' && !req.kondisi_required) {
          return true;
        }
        
        // RULE 2: Bantuan documents - only for bantuan recipients
        if (req.kategori_dokumen === 'Bantuan') {
          if (!isBantuanRecipient) return false; // Skip if not bantuan
          
          // If has condition, check if status matches
          if (req.kondisi_required) {
            return statusSosial && req.kondisi_required.includes(statusSosial);
          }
          
          // No condition = required for all bantuan
          return true;
        }
        
        // RULE 3: Optional documents - always show
        if (req.kategori_dokumen === 'Optional') {
          return true;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error getting document requirements:', error);
      throw error;
    }
  }

  /**
   * Get documents for a specific santri
   */
  static async getSantriDocuments(santriId: string): Promise<DocumentFile[]> {
    try {
      const { data, error } = await supabase
        .from('dokumen_santri')
        .select('*')
        .eq('santri_id', santriId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting santri documents:', error);
      throw error;
    }
  }

  /**
   * Upload document
   */
  static async uploadDocument(
    santriId: string,
    documentType: string,
    file: File,
    pengajuanBantuanId?: string
  ): Promise<DocumentFile> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExtension}`;
      const filePath = `santri/${santriId}/${documentType}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('santri-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get document requirement info
      const requirements = await this.getDocumentRequirements();
      const requirement = requirements.find(r => r.jenis_dokumen === documentType);

      // Insert document record
      const { data, error } = await supabase
        .from('dokumen_santri')
        .insert({
          santri_id: santriId,
          jenis_dokumen: documentType,
          nama_dokumen: documentType,
          nama_file: file.name,
          path_file: filePath,
          ukuran_file: file.size,
          tipe_file: file.type,
          status_verifikasi: 'Belum Diverifikasi',
          kategori_dokumen: requirement?.kategori_dokumen || 'Reguler',
          is_required: requirement?.is_required || false,
          is_editable_by_santri: requirement?.is_editable_by_santri ?? true,
          pengajuan_bantuan_id: pengajuanBantuanId,
          keterangan: requirement?.deskripsi
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('dokumen_santri')
        .select('path_file')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (document.path_file) {
        const { error: storageError } = await supabase.storage
          .from('santri-documents')
          .remove([document.path_file]);

        if (storageError) console.warn('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('dokumen_santri')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Verify document
   */
  static async verifyDocument(
    documentId: string,
    status: 'Diverifikasi' | 'Belum Diverifikasi' | 'Ditolak',
    catatan?: string,
    verifikasiOleh?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status_verifikasi: status,
        tanggal_verifikasi: new Date().toISOString(),
        catatan_verifikasi: catatan
      };

      if (verifikasiOleh) {
        updateData.verifikasi_oleh = verifikasiOleh;
      }

      const { error } = await supabase
        .from('dokumen_santri')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error verifying document:', error);
      throw error;
    }
  }

  /**
   * Get document download URL
   */
  static async getDocumentUrl(pathFile: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('santri-documents')
        .createSignedUrl(pathFile, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      throw error;
    }
  }

  /**
   * Download document
   */
  static async downloadDocument(pathFile: string, fileName: string): Promise<void> {
    try {
      const url = await this.getDocumentUrl(pathFile);
      
      const response = await fetch(url);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }
}
