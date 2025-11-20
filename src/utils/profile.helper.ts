// Profile Helper - Dynamic field and document requirements based on santri category

export interface ProfileField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  required: boolean;
  options?: string[];
  category: string[];
  description?: string;
}

export interface DocumentRequirement {
  jenis_dokumen: string;
  required: boolean;
  description?: string;
  category: string[];
}

export class ProfileHelper {
  /**
   * Get required fields based on santri category
   */
  static getRequiredFields(kategori: string, statusSosial?: string): ProfileField[] {
    const baseFields: ProfileField[] = [
      {
        key: 'nama_lengkap',
        label: 'Nama Lengkap',
        type: 'text',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        key: 'tempat_lahir',
        label: 'Tempat Lahir',
        type: 'text',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        key: 'tanggal_lahir',
        label: 'Tanggal Lahir',
        type: 'date',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'select',
        required: true,
        options: ['Laki-laki', 'Perempuan'],
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        key: 'no_whatsapp',
        label: 'Nomor WhatsApp',
        type: 'text',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        key: 'alamat',
        label: 'Alamat Lengkap',
        type: 'textarea',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      }
    ];

    const binaanFields: ProfileField[] = [
      {
        key: 'status_sosial',
        label: 'Status Sosial',
        type: 'select',
        required: true,
        options: ['Yatim', 'Piatu', 'Yatim Piatu', 'Dhuafa'],
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      },
      {
        key: 'anak_ke',
        label: 'Anak Ke-',
        type: 'number',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      },
      {
        key: 'jumlah_saudara',
        label: 'Jumlah Saudara',
        type: 'number',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      },
      {
        key: 'hobi',
        label: 'Hobi',
        type: 'text',
        required: true,
        category: ['Binaan Mukim']
      },
      {
        key: 'cita_cita',
        label: 'Cita-cita',
        type: 'text',
        required: true,
        category: ['Binaan Mukim']
      }
    ];

    const mukimFields: ProfileField[] = [
      {
        key: 'nama_sekolah',
        label: 'Nama Sekolah',
        type: 'text',
        required: true,
        category: ['Binaan Mukim']
      },
      {
        key: 'kelas_sekolah',
        label: 'Kelas',
        type: 'text',
        required: true,
        category: ['Binaan Mukim']
      },
      {
        key: 'nomor_wali_kelas',
        label: 'Nomor Wali Kelas',
        type: 'text',
        required: true,
        category: ['Binaan Mukim']
      }
    ];

    const mahasiswaFields: ProfileField[] = [
      {
        key: 'nama_sekolah',
        label: 'Nama Universitas',
        type: 'text',
        required: true,
        category: ['Mahasiswa']
      },
      {
        key: 'kelas_sekolah',
        label: 'Program Studi',
        type: 'text',
        required: true,
        category: ['Mahasiswa']
      }
    ];

    // Combine fields based on category
    let requiredFields = [...baseFields];

    if (kategori === 'Binaan Mukim') {
      requiredFields = [...requiredFields, ...binaanFields, ...mukimFields];
    } else if (kategori === 'Binaan Non-Mukim') {
      requiredFields = [...requiredFields, ...binaanFields];
    } else if (kategori === 'Mahasiswa') {
      requiredFields = [...requiredFields, ...mahasiswaFields];
    }

    return requiredFields;
  }

  /**
   * Get required documents based on santri category
   */
  static getRequiredDocuments(kategori: string, statusSosial?: string): DocumentRequirement[] {
    const baseDocuments: DocumentRequirement[] = [
      {
        jenis_dokumen: 'Pas Foto',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        jenis_dokumen: 'Kartu Keluarga',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      },
      {
        jenis_dokumen: 'Akta Kelahiran',
        required: true,
        category: ['Reguler', 'Binaan Mukim', 'Binaan Non-Mukim', 'Mahasiswa']
      }
    ];

    const binaanDocuments: DocumentRequirement[] = [
      {
        jenis_dokumen: 'KTP Wali Utama',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      },
      {
        jenis_dokumen: 'KTP Wali Pendamping',
        required: false,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      },
      {
        jenis_dokumen: 'Ijazah Terakhir',
        required: true,
        category: ['Binaan Mukim']
      },
      {
        jenis_dokumen: 'Transkrip Nilai',
        required: true,
        category: ['Binaan Mukim']
      },
      {
        jenis_dokumen: 'Surat Keterangan Sehat',
        required: true,
        category: ['Binaan Mukim']
      }
    ];

    // Status sosial specific documents
    const statusDocuments: DocumentRequirement[] = [];
    if (statusSosial === 'Dhuafa') {
      statusDocuments.push({
        jenis_dokumen: 'SKTM',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      });
    } else if (statusSosial === 'Yatim') {
      statusDocuments.push({
        jenis_dokumen: 'Akta Kematian Ayah',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      });
    } else if (statusSosial === 'Piatu') {
      statusDocuments.push({
        jenis_dokumen: 'Akta Kematian Ibu',
        required: true,
        category: ['Binaan Mukim', 'Binaan Non-Mukim']
      });
    } else if (statusSosial === 'Yatim Piatu') {
      statusDocuments.push(
        {
          jenis_dokumen: 'Akta Kematian Ayah',
          required: true,
          category: ['Binaan Mukim', 'Binaan Non-Mukim']
        },
        {
          jenis_dokumen: 'Akta Kematian Ibu',
          required: true,
          category: ['Binaan Mukim', 'Binaan Non-Mukim']
        }
      );
    }

    // Combine documents based on category
    let requiredDocuments = [...baseDocuments];

    if (kategori === 'Binaan Mukim') {
      requiredDocuments = [...requiredDocuments, ...binaanDocuments, ...statusDocuments];
    } else if (kategori === 'Binaan Non-Mukim') {
      requiredDocuments = [...requiredDocuments, ...statusDocuments];
    }

    return requiredDocuments;
  }

  /**
   * Get available tabs based on santri category
   */
  static getAvailableTabs(kategori: string, tipePembayaran: string): string[] {
    const baseTabs = ['info', 'program', 'wali', 'dokumen'];
    
    if (kategori === 'Binaan Mukim' || kategori === 'Binaan Non-Mukim') {
      return ['info', 'bantuan', 'program', 'wali', 'dokumen'];
    } else if (kategori === 'Mahasiswa') {
      return ['info', 'program', 'wali', 'tagihan', 'dokumen'];
    } else {
      // Reguler
      return ['info', 'program', 'wali', 'tagihan', 'dokumen'];
    }
  }

  /**
   * Check if field is required for current category
   */
  static isFieldRequired(fieldKey: string, kategori: string): boolean {
    const fields = this.getRequiredFields(kategori);
    const field = fields.find(f => f.key === fieldKey);
    return field ? field.required : false;
  }

  /**
   * Check if document is required for current category
   */
  static isDocumentRequired(documentType: string, kategori: string, statusSosial?: string): boolean {
    const documents = this.getRequiredDocuments(kategori, statusSosial);
    const document = documents.find(d => d.jenis_dokumen === documentType);
    return document ? document.required : false;
  }
}
