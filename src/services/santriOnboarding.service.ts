// Santri Onboarding Service - Check profile completion and guide onboarding
import { supabase } from "@/integrations/supabase/client";
import { ProfileHelper } from "@/utils/profile.helper";

export interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: MissingField[];
  missingDocuments: MissingDocument[];
  missingWali: boolean;
  nextSteps: string[];
  canSkipOnboarding: boolean; // Allow skip if basic info is filled
}

export interface MissingField {
  key: string;
  label: string;
  category: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface MissingDocument {
  jenis_dokumen: string;
  required: boolean;
  category: string;
}

export class SantriOnboardingService {
  /**
   * Check if santri profile is complete
   */
  static async checkProfileCompletion(santriId: string | null | undefined): Promise<ProfileCompletionStatus> {
    // Return early if santriId is not provided
    if (!santriId) {
      return {
        isComplete: false,
        completionPercentage: 0,
        missingFields: [],
        missingDocuments: [],
        missingWali: true,
        nextSteps: ['ID Santri tidak ditemukan. Silakan hubungi administrator.'],
        canSkipOnboarding: false,
      };
    }
    
    try {
      // Get santri data
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError || !santri) {
        return {
          isComplete: false,
          completionPercentage: 0,
          missingFields: [],
          missingDocuments: [],
          missingWali: true,
          nextSteps: ['Data santri tidak ditemukan. Silakan hubungi administrator.'],
          canSkipOnboarding: false,
        };
      }

      const missingFields: MissingField[] = [];
      const missingDocuments: MissingDocument[] = [];
      let totalChecks = 0;
      let passedChecks = 0;

      // Check basic required fields
      const requiredFields = ProfileHelper.getRequiredFields(santri.kategori, santri.status_sosial);
      
      requiredFields.forEach(field => {
        totalChecks++;
        const value = santri[field.key];
        const isEmpty = !value || 
          (typeof value === 'string' && value.trim() === '') ||
          (typeof value === 'number' && isNaN(value));

        if (isEmpty) {
          missingFields.push({
            key: field.key,
            label: field.label,
            category: 'Data Pribadi',
            severity: field.required ? 'critical' : 'high',
          });
        } else {
          passedChecks++;
        }
      });

      // Check NIK (always required)
      totalChecks++;
      if (!santri.nik || santri.nik.trim() === '') {
        missingFields.push({
          key: 'nik',
          label: 'NIK',
          category: 'Data Pribadi',
          severity: 'critical',
        });
      } else {
        passedChecks++;
      }

      // Check wali data
      const { data: waliData, error: waliError } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId);

      const hasWaliUtama = waliData?.some(w => w.is_utama && w.nama_lengkap?.trim());
      const missingWali = !hasWaliUtama;

      if (missingWali) {
        totalChecks++;
        missingFields.push({
          key: 'wali_utama',
          label: 'Data Wali Utama',
          category: 'Data Wali',
          severity: 'critical',
        });
      } else {
        passedChecks++;
        totalChecks++;
      }

      // Check if Binaan needs 2 wali
      if (santri.kategori === 'Binaan Mukim' && waliData && waliData.length < 2) {
        totalChecks++;
        missingFields.push({
          key: 'wali_pendamping',
          label: 'Data Wali Pendamping',
          category: 'Data Wali',
          severity: 'high',
        });
      } else if (santri.kategori === 'Binaan Mukim') {
        passedChecks++;
        totalChecks++;
      }

      // Check wali completeness for Binaan
      if (santri.kategori?.includes('Binaan') && waliData) {
        waliData.forEach((wali, index) => {
          totalChecks++;
          const hasPekerjaan = wali.pekerjaan && wali.pekerjaan.trim() !== '';
          const hasPenghasilan = wali.penghasilan_bulanan !== undefined && wali.penghasilan_bulanan !== null;

          if (!hasPekerjaan || !hasPenghasilan) {
            missingFields.push({
              key: `wali_${index}_pekerjaan`,
              label: `Pekerjaan & Penghasilan Wali ${wali.is_utama ? 'Utama' : 'Pendamping'}`,
              category: 'Data Wali',
              severity: 'high',
            });
          } else {
            passedChecks++;
          }
        });
      }

      // Check documents - use DocumentService to get requirements (consistent with UI)
      const { DocumentService } = await import('@/services/document.service');
      const requiredDocs = await DocumentService.getDocumentRequirements(
        santri.kategori || 'ALL',
        santri.status_sosial,
        santri.kategori?.includes('Binaan') || false
      );

      const { data: uploadedDocs, error: docsError } = await supabase
        .from('dokumen_santri')
        .select('jenis_dokumen')
        .eq('santri_id', santriId);

      // Normalize document names for comparison (case-insensitive, trim whitespace)
      const normalizeDocName = (name: string): string => {
        return name.trim().toLowerCase().replace(/\s+/g, ' ');
      };

      const uploadedDocTypesNormalized = (uploadedDocs?.map(d => normalizeDocName(d.jenis_dokumen)) || []);

      // Filter only required documents
      const requiredDocsList = requiredDocs.filter(doc => doc.is_required);

      console.log('📋 [Onboarding] Checking documents:', {
        required: requiredDocsList.map(d => d.jenis_dokumen),
        uploaded: uploadedDocs?.map(d => d.jenis_dokumen),
        uploadedNormalized: uploadedDocTypesNormalized
      });

      requiredDocsList.forEach(doc => {
        totalChecks++;
        const docNameNormalized = normalizeDocName(doc.jenis_dokumen);
        const isUploaded = uploadedDocTypesNormalized.includes(docNameNormalized);

        if (!isUploaded) {
          console.log('⚠️ [Onboarding] Missing document:', doc.jenis_dokumen);
          missingDocuments.push({
            jenis_dokumen: doc.jenis_dokumen,
            required: true,
            category: 'Dokumen',
          });
        } else {
          passedChecks++;
          console.log('✅ [Onboarding] Document found:', doc.jenis_dokumen);
        }
      });

      // Calculate completion percentage
      const completionPercentage = totalChecks > 0 
        ? Math.round((passedChecks / totalChecks) * 100) 
        : 0;

      const isComplete = completionPercentage === 100 && !missingWali;

      // Generate next steps
      const nextSteps: string[] = [];
      if (missingFields.length > 0) {
        const criticalFields = missingFields.filter(f => f.severity === 'critical');
        if (criticalFields.length > 0) {
          nextSteps.push(`Lengkapi ${criticalFields.length} data wajib: ${criticalFields.slice(0, 3).map(f => f.label).join(', ')}`);
        }
      }
      if (missingDocuments.length > 0) {
        const requiredDocs = missingDocuments.filter(d => d.required);
        if (requiredDocs.length > 0) {
          nextSteps.push(`Upload ${requiredDocs.length} dokumen wajib: ${requiredDocs.slice(0, 3).map(d => d.jenis_dokumen).join(', ')}`);
        }
      }
      if (missingWali) {
        nextSteps.push('Tambahkan data wali utama');
      }

      // Can skip if basic info is filled (nama, kategori, tanggal_lahir, no_whatsapp)
      const canSkipOnboarding = !!(
        santri.nama_lengkap?.trim() &&
        santri.kategori &&
        santri.tanggal_lahir &&
        santri.no_whatsapp?.trim()
      );

      return {
        isComplete,
        completionPercentage,
        missingFields,
        missingDocuments,
        missingWali,
        nextSteps: nextSteps.length > 0 ? nextSteps : ['Profil sudah lengkap!'],
        canSkipOnboarding,
      };
    } catch (error) {
      console.error('Error checking profile completion:', error);
      return {
        isComplete: false,
        completionPercentage: 0,
        missingFields: [],
        missingDocuments: [],
        missingWali: true,
        nextSteps: ['Terjadi kesalahan saat memeriksa profil. Silakan coba lagi.'],
        canSkipOnboarding: false,
      };
    }
  }

  /**
   * Get onboarding progress for a santri
   */
  static async getOnboardingProgress(santriId: string): Promise<{
    currentStep: number;
    totalSteps: number;
    steps: Array<{
      id: string;
      label: string;
      completed: boolean;
      required: boolean;
    }>;
  }> {
    const completion = await this.checkProfileCompletion(santriId);

    const steps = [
      {
        id: 'basic_info',
        label: 'Informasi Dasar',
        completed: !completion.missingFields.some(f => f.category === 'Data Pribadi' && f.severity === 'critical'),
        required: true,
      },
      {
        id: 'wali',
        label: 'Data Wali',
        completed: !completion.missingWali,
        required: true,
      },
      {
        id: 'documents',
        label: 'Dokumen',
        completed: completion.missingDocuments.filter(d => d.required).length === 0,
        required: true,
      },
    ];

    const currentStep = steps.findIndex(s => !s.completed);
    const totalSteps = steps.length;

    return {
      currentStep: currentStep === -1 ? totalSteps : currentStep + 1,
      totalSteps,
      steps,
    };
  }
}

