import { useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ReceiptItem {
  id: string;
  nama_barang: string;
  jumlah: number;
  satuan: string;
  harga_satuan_jual: number;
  subtotal: number;
}

interface ReceiptNotaProps {
  penjualan: {
    id: string;
    nomor_struk?: string | null;
    tanggal: string;
    kasir_name?: string;
    metode_pembayaran?: string;
    total_transaksi: number;
    jumlah_bayar?: number;
    kembalian?: number;
  };
  items: ReceiptItem[];
  onClose?: () => void;
  autoPrint?: boolean;
  showActions?: boolean; // Tampilkan tombol download/share
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ReceiptNota({
  penjualan,
  items,
  onClose,
  autoPrint = false,
  showActions = true,
}: ReceiptNotaProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoPrint && !onClose) {
      // Auto print jika tidak ada onClose (untuk direct print)
      const timer = setTimeout(() => {
        if (componentRef.current) {
          window.print();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (autoPrint && onClose) {
      // Auto print dengan close callback
      const timer = setTimeout(() => {
        if (componentRef.current) {
          window.print();
          setTimeout(() => {
            if (onClose) onClose();
          }, 1000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, onClose]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy HH.mm', { locale: id });
  };

  const total = penjualan.total_transaksi || 0;
  const bayar = penjualan.jumlah_bayar || total;
  const kembalian = penjualan.kembalian || 0;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!componentRef.current) {
      toast.error('Gagal memuat nota untuk diunduh');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Hide action buttons temporarily
      const actionButtons = componentRef.current.querySelector('.no-print');
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = 'none';
      }

      // Capture the receipt as canvas
      const canvas = await html2canvas(componentRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: componentRef.current.scrollWidth,
        height: componentRef.current.scrollHeight,
        letterRendering: true, // Better text rendering
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded before capture
          const clonedElement = clonedDoc.querySelector('.receipt-print');
          if (clonedElement) {
            // Force font rendering
            (clonedElement as HTMLElement).style.fontFamily = 'Arial, sans-serif';
          }
        },
      });

      // Restore action buttons
      if (actionButtons) {
        (actionButtons as HTMLElement).style.display = '';
      }

      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');

      // Calculate PDF dimensions (80mm width, maintain aspect ratio)
      const imgWidth = 80; // 80mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const doc = new jsPDF({
        unit: 'mm',
        format: [imgWidth, imgHeight],
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      });

      // Add image to PDF
      doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

      // Save PDF
      const nomorStruk = penjualan.nomor_struk || penjualan.id.slice(0, 8).toUpperCase();
      const filename = `Nota_${nomorStruk}_${format(new Date(penjualan.tanggal), 'yyyyMMdd')}.pdf`;
      doc.save(filename);

      toast.success('PDF berhasil diunduh');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunduh PDF';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShareWA = () => {
    // Format items list with better readability
    const itemsText = items.map(item => 
      `• ${item.nama_barang}
  ${item.jumlah} ${item.satuan || 'pcs'} × ${formatRupiah(item.harga_satuan_jual)} = ${formatRupiah(item.subtotal)}`
    ).join('\n\n');
    
    // Create text message (NOT PDF - just plain text)
    const message = `*NOTA PENJUALAN SANTRA MART*

*No. Transaksi:* ${penjualan.nomor_struk || penjualan.id.slice(0, 8).toUpperCase()}
*Tanggal:* ${formatDateTime(penjualan.tanggal)}
*Kasir:* ${penjualan.kasir_name || 'Admin'}

*Daftar Pembelian:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
*TOTAL:* ${formatRupiah(total)}
*Bayar:* ${formatRupiah(bayar)}
*Kembali:* ${formatRupiah(kembalian)}
━━━━━━━━━━━━━━━━━━━━

Terima kasih telah menjadi bagian dari gerakan "SANTRI MANDIRI & BERDIKARI"

Belanja Anda hari ini membantu:
✓ Beasiswa pendidikan santri yatim dan dhuafa
✓ Pelatihan kewirausahaan
✓ Pemberdayaan ekonomi pesantren

---
*Koperasi Pesantren Anak Yatim Al-Bisri*
Gunung Anyar Lor 2/62, Surabaya
HP/WA: 085955303882`;

    // Encode message for WhatsApp URL (text only, NOT PDF)
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp with text message (NOT PDF)
    window.open(waUrl, '_blank');
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .receipt-print, .receipt-print * {
            visibility: visible;
          }
          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 8mm 5mm;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .receipt-print {
            max-width: 80mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
        }
      `}</style>
      <div className="receipt-print" ref={componentRef}>
        {/* Header dengan desain modern */}
        <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-gray-600 text-xl">*</span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
              SANTRA MART
            </h1>
            <span className="text-gray-600 text-xl">*</span>
          </div>
          <p className="text-xs font-semibold text-gray-700 mb-1 tracking-wide">
            Santri Nusantara Mart
          </p>
          <p className="text-[10px] text-gray-600 leading-tight">
            Koperasi Pesantren Anak Yatim Al-Bisri
          </p>
        </div>

        {/* Info Kontak & Bank */}
        <div className="text-center mb-3 pb-2 border-b border-dashed border-gray-300">
          <p className="text-[9px] text-gray-600 leading-tight">
            Gunung Anyar Lor 2/62, Surabaya
          </p>
          <p className="text-[9px] text-gray-600 leading-tight">
            HP/WA: 085955303882 / 085100172617
          </p>
          <p className="text-[9px] text-gray-600 leading-tight mt-1">
            BSI: 3334444940 a/n YPAY AL-BISRI
          </p>
        </div>

        {/* Transaction Details */}
        <div className="mb-3 pb-2 border-b border-dashed border-gray-300">
          <div className="flex justify-between items-start text-[10px] mb-1">
            <span className="text-gray-600 font-medium">No. Transaksi:</span>
            <span className="text-gray-900 font-mono text-[9px] text-right max-w-[60%] break-all">
              {penjualan.nomor_struk || penjualan.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-gray-600 font-medium">Tgl:</span>
            <span className="text-gray-900 font-medium">
              {formatDateTime(penjualan.tanggal)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-600 font-medium">Kasir:</span>
            <span className="text-gray-900 font-medium capitalize">
              {penjualan.kasir_name || 'Admin'}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="mb-3 pb-2 border-b border-dashed border-gray-300">
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id || index} className="text-[10px]">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="text-gray-900 font-medium flex-1 pr-2">
                    {item.nama_barang}
                  </span>
                  <span className="text-gray-900 font-semibold text-right whitespace-nowrap">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-gray-600">
                  <span>
                    {item.jumlah} {item.satuan || 'pcs'} × {formatRupiah(item.harga_satuan_jual)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-3 pb-2 border-b-2 border-dashed border-gray-400">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-900">TOTAL</span>
            <span className="text-sm font-bold text-gray-900">
              {formatRupiah(total)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-gray-600">Bayar:</span>
            <span className="text-gray-900 font-medium">
              {formatRupiah(bayar)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-600">Kembali:</span>
            <span className="text-gray-900 font-medium">
              {formatRupiah(kembalian)}
            </span>
          </div>
        </div>

        {/* Footer dengan pesan impact */}
        <div className="text-center pt-2">
          <p className="text-[9px] text-gray-700 font-medium mb-2 leading-tight">
            Terima Kasih Telah Menjadi Bagian dari Gerakan
          </p>
          <p className="text-[9px] text-gray-800 font-bold mb-3 leading-tight">
            "SANTRI MANDIRI & BERDIKARI"
          </p>
          
          <div className="text-[9px] text-gray-600 mb-2 text-left">
            <p className="font-medium mb-1">Belanja Anda hari ini membantu:</p>
            <ul className="space-y-0.5 pl-2">
              <li className="flex items-start">
                <span className="mr-1">✓</span>
                <span>Beasiswa pendidikan santri yatim dan dhuafa</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1">✓</span>
                <span>Pelatihan kewirausahaan</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1">✓</span>
                <span>Pemberdayaan ekonomi pesantren</span>
              </li>
            </ul>
          </div>

          <div className="mt-3 pt-2 border-t border-dashed border-gray-300">
            <p className="text-[9px] text-gray-600">
              Layanan Pelanggan: WA: 085955303882
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-4 pt-4 border-t border-gray-300 flex gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex-1"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWA}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share WA
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

