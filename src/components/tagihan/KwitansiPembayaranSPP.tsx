import React from 'react';
import { PembayaranSantri } from '@/services/tagihan.service';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface KwitansiPembayaranSPPProps {
  pembayaran: PembayaranSantri & {
    tagihan?: any;
    santri?: any;
    donatur?: any;
  };
  isOpen: boolean;
  onClose: () => void;
}

const KwitansiPembayaranSPP: React.FC<KwitansiPembayaranSPPProps> = ({ pembayaran, isOpen, onClose }) => {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTanggal = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const terbilang = (angka: number): string => {
    if (angka === 0) return 'Nol';
    
    const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
    
    const convertRatusan = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return bilangan[n];
      if (n === 10) return 'Sepuluh';
      if (n === 11) return 'Sebelas';
      if (n < 20) return bilangan[n - 10] + ' Belas';
      if (n < 100) {
        const puluhan = Math.floor(n / 10);
        const satuan = n % 10;
        return bilangan[puluhan] + ' Puluh' + (satuan > 0 ? ' ' + bilangan[satuan] : '');
      }
      if (n < 200) return 'Seratus' + (n % 100 > 0 ? ' ' + convertRatusan(n % 100) : '');
      if (n < 1000) {
        const ratusan = Math.floor(n / 100);
        const sisa = n % 100;
        return bilangan[ratusan] + ' Ratus' + (sisa > 0 ? ' ' + convertRatusan(sisa) : '');
      }
      return '';
    };
    
    if (angka < 1000) return convertRatusan(angka);
    if (angka < 2000) return 'Seribu' + (angka % 1000 > 0 ? ' ' + convertRatusan(angka % 1000) : '');
    if (angka < 1000000) {
      const ribuan = Math.floor(angka / 1000);
      const sisa = angka % 1000;
      return convertRatusan(ribuan) + ' Ribu' + (sisa > 0 ? ' ' + convertRatusan(sisa) : '');
    }
    if (angka < 1000000000) {
      const jutaan = Math.floor(angka / 1000000);
      const sisa = angka % 1000000;
      return convertRatusan(jutaan) + ' Juta' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
    }
    return 'Angka terlalu besar';
  };

  const handlePrint = () => {
    window.print();
  };

  const sumberPembayaranLabel = {
    'orang_tua': 'Orang Tua / Wali',
    'donatur': 'Donatur',
    'yayasan': 'Yayasan / Subsidi Internal'
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          <div className="print:hidden flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Kwitansi Pembayaran SPP</h2>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Cetak
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Tutup
              </Button>
            </div>
          </div>

          <div className="kwitansi-container bg-white p-8 print:p-0" id="kwitansi-print">
            {/* Header */}
            <div className="text-center mb-6 print:mb-4">
              <h1 className="text-2xl font-bold mb-2 print:text-xl">PESANTREN ANAK YATIM AL-BISRI</h1>
              <p className="text-sm text-gray-600 print:text-xs">
                Lembaga Kesejahteraan Sosial Anak (LKSA)
              </p>
              <p className="text-sm text-gray-600 print:text-xs">
                Jl. Raya Kudus-Pati KM 5, Kudus, Jawa Tengah
              </p>
              <p className="text-sm text-gray-600 print:text-xs">
                Telp: (0291) 123456 | Email: info@albisri.or.id
              </p>
            </div>

            {/* Judul Kwitansi */}
            <div className="text-center mb-6 print:mb-4 border-b-2 border-black pb-2">
              <h2 className="text-xl font-bold print:text-lg">KWITANSI PEMBAYARAN SPP</h2>
              <p className="text-sm print:text-xs">Nomor: {pembayaran.nomor_referensi || '-'}</p>
            </div>

            {/* Detail Pembayaran */}
            <div className="space-y-3 print:space-y-2 mb-6 print:mb-4">
              <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div>
                  <p className="text-sm font-semibold print:text-xs">Tanggal Pembayaran</p>
                  <p className="text-sm print:text-xs">{formatTanggal(pembayaran.tanggal_bayar)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold print:text-xs">Metode Pembayaran</p>
                  <p className="text-sm print:text-xs">{pembayaran.metode_pembayaran}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold print:text-xs mb-1">Nama Santri</p>
                <p className="text-base font-semibold print:text-sm">
                  {pembayaran.santri?.nama_lengkap || '-'}
                  {pembayaran.santri?.id_santri && ` (${pembayaran.santri.id_santri})`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div>
                  <p className="text-sm font-semibold print:text-xs">ID Santri</p>
                  <p className="text-sm print:text-xs">{pembayaran.santri?.id_santri || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold print:text-xs">Kategori</p>
                  <p className="text-sm print:text-xs">{pembayaran.santri?.kategori || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold print:text-xs mb-1">Periode Tagihan</p>
                <p className="text-sm print:text-xs">
                  {pembayaran.tagihan?.bulan || ''} {pembayaran.tagihan?.periode || ''}
                  {pembayaran.tagihan?.tahun_ajaran && ` - Tahun Ajaran ${pembayaran.tagihan.tahun_ajaran}`}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold print:text-xs mb-1">Sumber Pembayaran</p>
                <p className="text-sm print:text-xs">
                  {pembayaran.sumber_pembayaran ? sumberPembayaranLabel[pembayaran.sumber_pembayaran] : '-'}
                  {pembayaran.sumber_pembayaran === 'donatur' && pembayaran.donatur?.donor_name && 
                    ` (${pembayaran.donatur.donor_name})`
                  }
                </p>
              </div>
            </div>

            {/* Jumlah Pembayaran */}
            <div className="border-2 border-black p-4 print:p-3 mb-6 print:mb-4">
              <div className="text-center">
                <p className="text-sm font-semibold print:text-xs mb-2">JUMLAH PEMBAYARAN</p>
                <p className="text-3xl font-bold print:text-2xl mb-2">
                  {formatRupiah(pembayaran.jumlah_bayar)}
                </p>
                <p className="text-sm print:text-xs italic">
                  Terbilang: {terbilang(Math.floor(pembayaran.jumlah_bayar))} Rupiah
                </p>
              </div>
            </div>

            {/* Catatan */}
            {pembayaran.catatan && (
              <div className="mb-6 print:mb-4">
                <p className="text-sm font-semibold print:text-xs mb-1">Catatan</p>
                <p className="text-sm print:text-xs">{pembayaran.catatan}</p>
              </div>
            )}

            {/* Footer - Tanda Tangan */}
            <div className="mt-8 print:mt-6 grid grid-cols-2 gap-8 print:gap-4">
              <div className="text-center">
                <p className="text-sm print:text-xs mb-12 print:mb-8">Penerima,</p>
                <div className="border-t border-black pt-2 print:pt-1">
                  <p className="text-sm font-semibold print:text-xs">Bendahara</p>
                  <p className="text-xs print:text-[10px] text-gray-600">Pesantren Al-Bisri</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm print:text-xs mb-12 print:mb-8">Yang Membayar,</p>
                <div className="border-t border-black pt-2 print:pt-1">
                  <p className="text-sm font-semibold print:text-xs">
                    {pembayaran.sumber_pembayaran === 'orang_tua' ? 'Orang Tua / Wali' : 
                     pembayaran.sumber_pembayaran === 'donatur' ? 'Donatur' : 
                     'Yayasan'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-6 print:mt-4 text-center text-xs print:text-[10px] text-gray-500 border-t border-gray-300 pt-2 print:pt-1">
              <p>Kwitansi ini adalah bukti sah pembayaran SPP</p>
              <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .kwitansi-container,
          .kwitansi-container * {
            visibility: visible;
          }
          .kwitansi-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default KwitansiPembayaranSPP;

