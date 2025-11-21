import React, { useRef, useEffect, useState } from 'react';
import { Donation } from '@/components/dashboard/donasi/DonationHistory';
import { supabase } from '@/integrations/supabase/client';

interface DonationReceiptProps {
  donation: Donation;
  onClose?: () => void;
}

const DonationReceipt: React.FC<DonationReceiptProps> = ({ donation, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const [nomorBukti, setNomorBukti] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil nomor bukti dari keuangan berdasarkan referensi donasi
    const fetchNomorBukti = async () => {
      try {
        const { data, error } = await supabase
          .from('keuangan')
          .select('nomor_bukti')
          .eq('referensi', `donation:${donation.id}`)
          .single();

        if (!error && data?.nomor_bukti) {
          setNomorBukti(data.nomor_bukti);
        }
      } catch (error) {
        console.error('Error fetching nomor bukti:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNomorBukti();
  }, [donation.id]);

  useEffect(() => {
    // Trigger print setelah component mount dan data loaded
    if (!loading) {
      const timer = setTimeout(() => {
        if (componentRef.current) {
          window.print();
          // Close setelah print dialog ditutup
          setTimeout(() => {
            if (onClose) onClose();
          }, 1000);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading, onClose]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDonationNumber = () => {
    // Gunakan nomor bukti dari keuangan jika ada, jika tidak gunakan format fallback
    if (nomorBukti) {
      return nomorBukti;
    }
    
    // Fallback: generate dari ID donasi
    const date = new Date(donation.donation_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const idShort = donation.id.substring(0, 8).toUpperCase();
    return `DONASI/${year}/${month}/${day}/${idShort}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Memuat nota...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .print-content {
            display: block;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>
      <div className="print-content" ref={componentRef}>
        <div className="bg-white" style={{ width: '100%', minHeight: '297mm' }}>
          {/* Header */}
          <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">PESANTREN AL-BISRI</h1>
            <p className="text-xl text-gray-700 font-medium">TANDA TERIMA DONASI</p>
          </div>

          {/* Nomor Nota dan Tanggal */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">No. Nota:</p>
                <p className="text-lg font-bold text-gray-900">{getDonationNumber()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Tanggal:</p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(donation.donation_date)}</p>
              </div>
            </div>
          </div>

          {/* Terima dari */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-400">
              Terima dari:
            </h2>
            <div className="space-y-2 text-sm pl-2">
              <div className="flex">
                <span className="font-semibold text-gray-700 w-20">Nama:</span>
                <span className="text-gray-900 flex-1">{donation.donor_name}</span>
              </div>
              {donation.donor_address && (
                <div className="flex">
                  <span className="font-semibold text-gray-700 w-20">Alamat:</span>
                  <span className="text-gray-900 flex-1">{donation.donor_address}</span>
                </div>
              )}
              {donation.donor_phone && (
                <div className="flex">
                  <span className="font-semibold text-gray-700 w-20">No. HP:</span>
                  <span className="text-gray-900 flex-1">{donation.donor_phone}</span>
                </div>
              )}
              {donation.donor_email && (
                <div className="flex">
                  <span className="font-semibold text-gray-700 w-20">Email:</span>
                  <span className="text-gray-900 flex-1">{donation.donor_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Berupa */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-400">
              Berupa:
            </h2>
            <div className="space-y-2 text-sm pl-2">
              {(donation.donation_type === 'cash' || donation.donation_type === 'mixed') && donation.cash_amount && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-700">• Uang Tunai</span>
                  <span className="font-bold text-gray-900 text-base">{formatCurrency(donation.cash_amount)}</span>
                </div>
              )}
              {donation.items && donation.items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {donation.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start py-1">
                      <span className="text-gray-700 flex-1">
                        • {item.raw_item_name} ({item.quantity} {item.uom})
                        {item.item_type === 'inventory' && (
                          <span className="text-xs text-gray-500 ml-2">[Inventaris]</span>
                        )}
                        {item.item_type === 'direct_consumption' && (
                          <span className="text-xs text-gray-500 ml-2">[Makanan]</span>
                        )}
                      </span>
                      {item.estimated_value && (
                        <span className="text-gray-600 font-medium ml-2">
                          {formatCurrency(item.estimated_value * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Untuk Hajat */}
          {donation.hajat_doa && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-400">
                Untuk Hajat:
              </h2>
              <div className="pl-2">
                <p className="text-sm text-gray-700 italic leading-relaxed">{donation.hajat_doa}</p>
              </div>
            </div>
          )}

          {/* Catatan */}
          {donation.notes && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-400">
                Catatan:
              </h2>
              <div className="pl-2">
                <p className="text-sm text-gray-700 leading-relaxed">{donation.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-20 text-center">
            <p className="text-sm text-gray-600 mb-16">
              Kudus, {formatDate(donation.donation_date)}
            </p>
            <div className="mt-12">
              <p className="text-sm font-bold text-gray-900 mb-2">Penerima</p>
              <div className="h-20 border-b-2 border-gray-800 w-56 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-2">(___________________)</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DonationReceipt;

