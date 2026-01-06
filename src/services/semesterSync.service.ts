import { supabase } from '@/integrations/supabase/client';
import { AkademikSemesterService, type Semester } from './akademikSemester.service';

/**
 * Service untuk sinkronisasi semester dengan modul lain
 * Single source of truth untuk semester aktif dan helper functions
 */
export class SemesterSyncService {
  /**
   * Get semester aktif - single source of truth
   */
  static async getActiveSemester(): Promise<Semester | null> {
    return await AkademikSemesterService.getSemesterAktif();
  }

  /**
   * Get semester by ID
   */
  static async getSemesterById(id: string): Promise<Semester | null> {
    const allSemesters = await AkademikSemesterService.listSemester();
    return allSemesters.find(s => s.id === id) || null;
  }

  /**
   * Get semester by date - untuk lookup semester berdasarkan tanggal
   */
  static async getSemesterByDate(date: string): Promise<Semester | null> {
    const allSemesters = await AkademikSemesterService.listSemester();
    const targetDate = new Date(date);
    
    return allSemesters.find(s => {
      const mulai = new Date(s.tanggal_mulai);
      const selesai = new Date(s.tanggal_selesai);
      return targetDate >= mulai && targetDate <= selesai;
    }) || null;
  }

  /**
   * Calculate duration bulan dari semester (bisa partial bulan)
   * Contoh: 15 Jan - 30 Jun = 5.5 bulan
   */
  static calculateSemesterDurationMonths(semester: Semester): number {
    const mulai = new Date(semester.tanggal_mulai);
    const selesai = new Date(semester.tanggal_selesai);
    
    // Calculate difference in months
    const yearDiff = selesai.getFullYear() - mulai.getFullYear();
    const monthDiff = selesai.getMonth() - mulai.getMonth();
    const dayDiff = selesai.getDate() - mulai.getDate();
    
    // Total months
    let totalMonths = yearDiff * 12 + monthDiff;
    
    // Add partial month if day difference is significant
    const daysInStartMonth = new Date(mulai.getFullYear(), mulai.getMonth() + 1, 0).getDate();
    const daysInEndMonth = new Date(selesai.getFullYear(), selesai.getMonth() + 1, 0).getDate();
    
    // Calculate partial month
    const startMonthPartial = (daysInStartMonth - mulai.getDate() + 1) / daysInStartMonth;
    const endMonthPartial = selesai.getDate() / daysInEndMonth;
    
    // If same month, calculate partial
    if (totalMonths === 0) {
      return startMonthPartial + endMonthPartial - 1;
    }
    
    // Add partial months
    totalMonths += startMonthPartial + endMonthPartial - 1;
    
    return Math.round(totalMonths * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get all dates dalam semester (untuk generate pertemuan)
   */
  static getDatesInSemester(semester: Semester): Date[] {
    const dates: Date[] = [];
    const mulai = new Date(semester.tanggal_mulai);
    const selesai = new Date(semester.tanggal_selesai);
    
    const current = new Date(mulai);
    while (current <= selesai) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Validate semester dates tidak overlap dengan semester lain
   */
  static async validateSemesterDates(
    tahunAjaranId: string,
    tanggalMulai: string,
    tanggalSelesai: string,
    excludeSemesterId?: string
  ): Promise<{ valid: boolean; conflicts: Semester[] }> {
    const allSemesters = await AkademikSemesterService.listSemester(tahunAjaranId);
    const start = new Date(tanggalMulai);
    const end = new Date(tanggalSelesai);
    
    const conflicts = allSemesters.filter(s => {
      // Skip semester yang sedang diedit
      if (excludeSemesterId && s.id === excludeSemesterId) return false;
      
      const sStart = new Date(s.tanggal_mulai);
      const sEnd = new Date(s.tanggal_selesai);
      
      // Check overlap: (start <= sEnd) && (end >= sStart)
      return (start <= sEnd) && (end >= sStart);
    });
    
    return {
      valid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Format semester untuk display
   */
  static formatSemesterDisplay(semester: Semester): string {
    const tahun = semester.tahun_ajaran?.nama || 
                  new Date(semester.tanggal_mulai).getFullYear();
    return `${semester.nama} ${tahun}`;
  }

  /**
   * Analyze impact saat semester dates berubah
   */
  static async analyzeSemesterUpdateImpact(
    semesterId: string,
    oldDates: { mulai: string; selesai: string },
    newDates: { mulai: string; selesai: string }
  ): Promise<{
    pertemuanAffected: number;
    tagihanAffected: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Check pertemuan yang akan terpengaruh
    const oldStart = new Date(oldDates.mulai);
    const oldEnd = new Date(oldDates.selesai);
    const newStart = new Date(newDates.mulai);
    const newEnd = new Date(newDates.selesai);
    
    // Get pertemuan di rentang lama
    const { data: pertemuanLama, error: pertemuanError } = await supabase
      .from('kelas_pertemuan')
      .select('id, tanggal, kelas:kelas_id(semester_id)')
      .gte('tanggal', oldDates.mulai)
      .lte('tanggal', oldDates.selesai);
    
    if (pertemuanError) {
      warnings.push(`Error checking pertemuan: ${pertemuanError.message}`);
    }
    
    // Filter pertemuan yang di luar rentang baru
    const pertemuanAffected = (pertemuanLama || []).filter((p: any) => {
      const tanggal = new Date(p.tanggal);
      return tanggal < newStart || tanggal > newEnd;
    }).length;
    
    // Check tagihan (jika ada semester_id reference)
    const { count: tagihanCount } = await supabase
      .from('tagihan_santri')
      .select('*', { count: 'exact', head: true })
      .eq('semester_id', semesterId);
    
    const tagihanAffected = tagihanCount || 0;
    
    // Generate warnings
    if (pertemuanAffected > 0) {
      warnings.push(`${pertemuanAffected} pertemuan akan berada di luar rentang semester baru`);
    }
    
    if (tagihanAffected > 0) {
      warnings.push(`${tagihanAffected} tagihan terhubung ke semester ini`);
    }
    
    return {
      pertemuanAffected,
      tagihanAffected,
      warnings
    };
  }

  /**
   * Get semester untuk dropdown/select
   */
  static async getSemesterOptions(): Promise<Array<{ value: string; label: string; semester: Semester }>> {
    const semesters = await AkademikSemesterService.listSemester();
    return semesters.map(s => ({
      value: s.id,
      label: this.formatSemesterDisplay(s),
      semester: s
    }));
  }
}





