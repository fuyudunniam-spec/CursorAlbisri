// Santri Data Validator - Validates cross-module data consistency
import { supabase } from "@/integrations/supabase/client";
import { ProfileHelper } from "@/utils/profile.helper";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  module: string;
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface ValidationWarning {
  module: string;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationSummary {
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number; // 0-100
}

export class SantriDataValidator {
  /**
   * Validate santri data consistency across all modules
   */
  static async validateSantriData(santriId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    try {
      // Get santri basic data
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError || !santriData) {
        errors.push({
          module: 'core',
          field: 'santri_id',
          message: 'Data santri tidak ditemukan',
          severity: 'critical'
        });
        return this.createValidationResult(errors, warnings, 0, 0);
      }

      // Run all validation checks
      await Promise.all([
        this.validateBasicData(santriData, errors, warnings, totalChecks, passedChecks),
        this.validateAcademicData(santriId, santriData, errors, warnings, totalChecks, passedChecks),
        this.validateFinancialData(santriId, santriData, errors, warnings, totalChecks, passedChecks),
        this.validateDocumentData(santriId, santriData, errors, warnings, totalChecks, passedChecks),
        this.validateWaliData(santriId, santriData, errors, warnings, totalChecks, passedChecks),
        this.validateBantuanData(santriId, santriData, errors, warnings, totalChecks, passedChecks)
      ]);

      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      return this.createValidationResult(errors, warnings, totalChecks, passedChecks, score);

    } catch (error) {
      console.error('Error validating santri data:', error);
      errors.push({
        module: 'system',
        field: 'validation',
        message: 'Terjadi kesalahan saat validasi data',
        severity: 'critical',
        suggestion: 'Coba lagi atau hubungi administrator'
      });
      return this.createValidationResult(errors, warnings, 0, 0);
    }
  }

  /**
   * Validate basic santri data
   */
  private static async validateBasicData(
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const checks = [
      { field: 'nama_lengkap', required: true, message: 'Nama lengkap harus diisi' },
      { field: 'jenis_kelamin', required: true, message: 'Jenis kelamin harus diisi' },
      { field: 'kategori', required: true, message: 'Kategori santri harus diisi' },
      { field: 'status_santri', required: true, message: 'Status santri harus diisi' },
      { field: 'no_whatsapp', required: true, message: 'Nomor WhatsApp harus diisi' }
    ];

    checks.forEach(check => {
      totalChecks++;
      if (!santriData[check.field] || santriData[check.field].trim() === '') {
        errors.push({
          module: 'core',
          field: check.field,
          message: check.message,
          severity: check.required ? 'high' : 'medium',
          suggestion: `Silakan lengkapi ${check.field}`
        });
      } else {
        passedChecks++;
      }
    });

    // Validate category-specific fields
    const requiredFields = ProfileHelper.getRequiredFields(santriData.kategori, santriData.status_sosial);
    requiredFields.forEach(field => {
      totalChecks++;
      if (!santriData[field.key] || santriData[field.key].toString().trim() === '') {
        errors.push({
          module: 'core',
          field: field.key,
          message: `${field.label} wajib diisi untuk kategori ${santriData.kategori}`,
          severity: 'high',
          suggestion: `Lengkapi ${field.label}`
        });
      } else {
        passedChecks++;
      }
    });
  }

  /**
   * Validate academic data consistency
   */
  private static async validateAcademicData(
    santriId: string, 
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const { data: programData } = await supabase
      .from('santri_kelas')
      .select('*')
      .eq('santri_id', santriId);

    totalChecks++;
    if ((santriData.status_santri || santriData.status_baru) === 'Aktif' && (!programData || programData.length === 0)) {
      errors.push({
        module: 'academic',
        field: 'program_assignment',
        message: 'Santri aktif harus memiliki program yang ditugaskan',
        severity: 'high',
        suggestion: 'Tempatkan santri ke program yang sesuai'
      });
    } else {
      passedChecks++;
    }

    // Validate program consistency
    if (programData && programData.length > 0) {
      programData.forEach((program, index) => {
        totalChecks++;
        if (!program.program_id) {
          errors.push({
            module: 'academic',
            field: `program_${index}`,
            message: 'Program harus memiliki referensi ke kelas yang valid',
            severity: 'medium',
            suggestion: 'Perbaiki referensi program'
          });
        } else {
          passedChecks++;
        }
      });
    }
  }

  /**
   * Validate financial data consistency
   */
  private static async validateFinancialData(
    santriId: string, 
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const [bantuanResult, tagihanResult, pembayaranResult] = await Promise.all([
      supabase
        .from('bantuan_aktif_santri')
        .select('*')
        .eq('santri_id', santriId)
        .eq('status', 'aktif'),
      supabase
        .from('tagihan_santri')
        .select('*')
        .eq('santri_id', santriId),
      supabase
        .from('pembayaran_santri')
        .select('*')
        .eq('santri_id', santriId)
    ]);

    // Validate bantuan consistency
    totalChecks++;
    if (santriData.kategori === 'Binaan Mukim' || santriData.kategori === 'Binaan Non-Mukim') {
      if (!bantuanResult.data || bantuanResult.data.length === 0) {
        errors.push({
          module: 'financial',
          field: 'bantuan',
          message: 'Santri binaan harus memiliki bantuan aktif',
          severity: 'high',
          suggestion: 'Buat pengajuan bantuan untuk santri'
        });
      } else {
        passedChecks++;
      }
    } else {
      passedChecks++;
    }

    // Validate payment consistency
    if (tagihanResult.data && tagihanResult.data.length > 0) {
      const totalTagihan = tagihanResult.data.reduce((sum, t) => sum + (t.total_tagihan || 0), 0);
      const totalPembayaran = pembayaranResult.data?.reduce((sum, p) => sum + (p.jumlah_bayar || 0), 0) || 0;

      totalChecks++;
      if (totalPembayaran > totalTagihan) {
        warnings.push({
          module: 'financial',
          field: 'payment_overflow',
          message: 'Total pembayaran melebihi total tagihan',
          suggestion: 'Periksa kembali data pembayaran'
        });
      } else {
        passedChecks++;
      }
    }
  }

  /**
   * Validate document data completeness
   */
  private static async validateDocumentData(
    santriId: string, 
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const requiredDocs = ProfileHelper.getRequiredDocuments(santriData.kategori, santriData.status_sosial);
    
    const { data: uploadedDocs } = await supabase
      .from('dokumen_santri')
      .select('*')
      .eq('santri_id', santriId);

    const dokumenWajibLengkap = requiredDocs.filter(reqDoc => 
      uploadedDocs?.some(uploaded => uploaded.jenis_dokumen === reqDoc.jenis_dokumen)
    ).length;

    totalChecks++;
    if (dokumenWajibLengkap < requiredDocs.length) {
      const missingCount = requiredDocs.length - dokumenWajibLengkap;
      errors.push({
        module: 'documents',
        field: 'required_documents',
        message: `${missingCount} dokumen wajib belum diupload`,
        severity: 'medium',
        suggestion: 'Upload dokumen yang belum lengkap'
      });
    } else {
      passedChecks++;
    }

    // Check document verification status
    if (uploadedDocs && uploadedDocs.length > 0) {
      const unverifiedDocs = uploadedDocs.filter(doc => doc.status_verifikasi === 'Belum Diverifikasi');
      
      if (unverifiedDocs.length > 0) {
        warnings.push({
          module: 'documents',
          field: 'verification',
          message: `${unverifiedDocs.length} dokumen belum diverifikasi`,
          suggestion: 'Lakukan verifikasi dokumen'
        });
      }
    }
  }

  /**
   * Validate wali data
   */
  private static async validateWaliData(
    santriId: string, 
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const { data: waliData } = await supabase
      .from('santri_wali')
      .select('*')
      .eq('santri_id', santriId);

    totalChecks++;
    if (!waliData || waliData.length === 0) {
      errors.push({
        module: 'wali',
        field: 'wali_data',
        message: 'Data wali harus diisi',
        severity: 'high',
        suggestion: 'Tambah data wali santri'
      });
    } else {
      passedChecks++;

      // Check for main wali
      const mainWali = waliData.find(wali => wali.is_utama);
      if (!mainWali) {
        warnings.push({
          module: 'wali',
          field: 'main_wali',
          message: 'Tidak ada wali utama yang ditetapkan',
          suggestion: 'Tetapkan salah satu wali sebagai wali utama'
        });
      }

      // Check contact information
      const waliWithoutContact = waliData.filter(wali => !wali.no_whatsapp && !wali.no_telepon);
      if (waliWithoutContact.length > 0) {
        warnings.push({
          module: 'wali',
          field: 'contact_info',
          message: 'Beberapa wali tidak memiliki kontak',
          suggestion: 'Lengkapi informasi kontak wali'
        });
      }
    }
  }

  /**
   * Validate bantuan data consistency
   */
  private static async validateBantuanData(
    santriId: string, 
    santriData: any, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number
  ) {
    const { data: bantuanData } = await supabase
      .from('bantuan_aktif_santri')
      .select('*')
      .eq('santri_id', santriId);

    if (bantuanData && bantuanData.length > 0) {
      bantuanData.forEach((bantuan, index) => {
        totalChecks++;
        if (!bantuan.nominal_per_bulan || bantuan.nominal_per_bulan <= 0) {
          errors.push({
            module: 'bantuan',
            field: `nominal_${index}`,
            message: 'Nominal bantuan harus lebih dari 0',
            severity: 'medium',
            suggestion: 'Periksa nominal bantuan'
          });
        } else {
          passedChecks++;
        }

        totalChecks++;
        if (!bantuan.tanggal_mulai) {
          errors.push({
            module: 'bantuan',
            field: `tanggal_mulai_${index}`,
            message: 'Tanggal mulai bantuan harus diisi',
            severity: 'medium',
            suggestion: 'Lengkapi tanggal mulai bantuan'
          });
        } else {
          passedChecks++;
        }
      });
    }
  }

  /**
   * Create validation result object
   */
  private static createValidationResult(
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    totalChecks: number, 
    passedChecks: number, 
    score?: number
  ): ValidationResult {
    const calculatedScore = score !== undefined ? score : (totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0);
    
    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      summary: {
        total_checks: totalChecks,
        passed: passedChecks,
        failed: totalChecks - passedChecks,
        warnings: warnings.length,
        score: calculatedScore
      }
    };
  }

  /**
   * Get validation recommendations based on results
   */
  static getValidationRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.summary.score < 70) {
      recommendations.push('Data santri memerlukan perhatian segera. Silakan perbaiki error yang ada.');
    }

    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push('Terdapat error kritis yang harus segera diperbaiki.');
    }

    const highErrors = result.errors.filter(e => e.severity === 'high');
    if (highErrors.length > 0) {
      recommendations.push('Lengkapi data yang wajib diisi untuk kategori santri ini.');
    }

    if (result.warnings.length > 0) {
      recommendations.push('Periksa warning yang ada untuk meningkatkan kualitas data.');
    }

    if (result.summary.score >= 90) {
      recommendations.push('Data santri sudah sangat baik! Tetap jaga konsistensi data.');
    }

    return recommendations;
  }
}

export default SantriDataValidator;

