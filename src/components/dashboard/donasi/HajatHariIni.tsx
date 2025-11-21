import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Share2, Heart, Phone, MapPin, DollarSign, Package, Calendar, Box, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Donation {
  id: string;
  donation_type: 'cash' | 'in_kind' | 'pledge' | 'mixed';
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date: string;
  cash_amount?: number;
  hajat_doa?: string;
  notes?: string;
  items?: Array<{
    raw_item_name: string;
    quantity: number;
    uom: string;
    item_type?: 'inventory' | 'direct_consumption';
  }>;
}

interface HajatHariIniProps {
  donations: Donation[];
  onPrintNota?: (donation: Donation) => void;
  onShareWA?: (donation: Donation) => void;
  onEdit?: (donation: Donation) => void;
  onPrintAll?: () => void;
}

const HajatHariIni: React.FC<HajatHariIniProps> = ({
  donations,
  onPrintNota,
  onShareWA,
  onEdit,
  onPrintAll
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Filter donations dengan hajat hari ini
  const today = new Date().toISOString().split('T')[0];
  const hajatHariIni = donations.filter(donation => {
    const donationDate = donation.donation_date.split('T')[0];
    return donationDate === today && donation.hajat_doa && donation.hajat_doa.trim() !== '';
  });

  const handlePrintAll = () => {
    if (hajatHariIni.length === 0) {
      toast.info('Tidak ada hajat hari ini untuk dicetak');
      return;
    }

    // Jika ada custom handler dari parent, gunakan itu
    if (onPrintAll) {
      onPrintAll();
      return;
    }

    // Default: print semua hajat hari ini
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Daftar Hajat Hari Ini - ${formatDate(today)}</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 20mm;
                }
              }
              body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 20px; 
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
              }
              h1 { 
                margin: 0;
                font-size: 24px;
                color: #1f2937;
              }
              h2 {
                margin: 10px 0;
                font-size: 18px;
                color: #4b5563;
                font-weight: 500;
              }
              .date-info {
                margin-top: 10px;
                color: #6b7280;
                font-size: 14px;
              }
              .hajat-item { 
                margin: 20px 0; 
                padding: 15px; 
                border-bottom: 1px solid #e5e7eb;
                page-break-inside: avoid;
              }
              .donor-name { 
                font-weight: bold; 
                font-size: 16px;
                color: #111827;
                margin-bottom: 8px;
              }
              .hajat-text { 
                margin-top: 8px; 
                color: #374151;
                font-style: italic;
                line-height: 1.6;
                font-size: 14px;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PESANTREN AL-BISRI</h1>
              <h2>Daftar Hajat Hari Ini</h2>
              <div class="date-info">${formatDate(today)}</div>
            </div>
            <div style="margin-top: 30px;">
              ${hajatHariIni.map((d, idx) => `
                <div class="hajat-item">
                  <div class="donor-name">${idx + 1}. ${d.donor_name}</div>
                  <div class="hajat-text">"${d.hajat_doa}"</div>
                </div>
              `).join('')}
            </div>
            <div class="footer">
              <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleShareWA = (donation?: Donation) => {
    if (donation) {
      // Share untuk satu donasi
      if (onShareWA) {
        onShareWA(donation);
      } else {
        const message = `Assalamu'alaikum. Terima kasih atas donasi dari ${donation.donor_name}. Semoga Allah SWT mengabulkan hajat yang dimohonkan. Aamiin.`;
        const phone = donation.donor_phone?.replace(/[^0-9]/g, '') || '';
        if (phone) {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        }
      }
    } else {
      // Share semua hajat hari ini dalam satu pesan
      if (hajatHariIni.length === 0) return;
      
      const hajatList = hajatHariIni.map((d, idx) => 
        `${idx + 1}. ${d.donor_name}: ${d.hajat_doa}`
      ).join('\n\n');
      
      const message = `Assalamu'alaikum. Berikut daftar hajat hari ini (${formatDate(today)}):\n\n${hajatList}\n\nSemoga Allah SWT mengabulkan semua hajat yang dimohonkan. Aamiin.`;
      
      // Buka WhatsApp dengan pesan (tanpa nomor spesifik, akan membuka chat baru)
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-4 pt-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">Hajat Hari Ini</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <p className="text-xs text-gray-500">
                {formatDateShort(today)}
              </p>
              {hajatHariIni.length > 0 && (
                <p className="text-xs text-gray-600">
                  • {hajatHariIni.length} hajat
                </p>
              )}
            </div>
          </div>
          {hajatHariIni.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareWA()}
                className="h-9 px-3 text-sm border-gray-200 hover:bg-gray-50 flex-shrink-0"
                title="Share semua hajat hari ini via WhatsApp"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share WA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAll}
                className="h-9 px-3 text-sm border-gray-200 hover:bg-gray-50 flex-shrink-0"
                title="Print semua hajat hari ini"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Semua
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hajatHariIni.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Tidak ada hajat hari ini</p>
            <p className="text-xs text-gray-400 mt-2">
              Hajat akan muncul di sini jika ada donasi dengan permintaan doa hari ini
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hajatHariIni.map((donation) => (
              <Card key={donation.id} className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {/* Donor Info */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">
                          {donation.donor_name}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          {donation.donor_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {donation.donor_phone}
                            </div>
                          )}
                          {donation.donor_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {donation.donor_address}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {donation.donation_type === 'cash' ? 'Tunai' : 
                         donation.donation_type === 'mixed' ? 'Campuran' : 'Barang'}
                      </Badge>
                    </div>
                  </div>

                  {/* Donation Details */}
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Donasi:</p>
                    <div className="space-y-1">
                      {/* Cash amount for cash or mixed donations */}
                      {(donation.donation_type === 'cash' || donation.donation_type === 'mixed') && donation.cash_amount && donation.cash_amount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>Uang Tunai: {formatCurrency(donation.cash_amount)}</span>
                        </div>
                      )}
                      {/* Items for in_kind or mixed donations */}
                      {(donation.donation_type === 'in_kind' || donation.donation_type === 'mixed') && donation.items && donation.items.length > 0 && (
                        donation.items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            {item.item_type === 'inventory' ? (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
                                <Box className="h-2.5 w-2.5" />
                                Inventaris
                              </Badge>
                            ) : item.item_type === 'direct_consumption' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0">
                                <Utensils className="h-2.5 w-2.5" />
                                Makanan
                              </Badge>
                            ) : (
                              <Package className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className="flex-1">{item.raw_item_name}: {item.quantity} {item.uom}</span>
                          </div>
                        ))
                      )}
                      {/* Show message if mixed but no cash and no items */}
                      {donation.donation_type === 'mixed' && 
                       (!donation.cash_amount || donation.cash_amount === 0) && 
                       (!donation.items || donation.items.length === 0) && (
                        <div className="text-sm text-gray-500 italic">
                          Belum ada detail donasi
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hajat Doa */}
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <Heart className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1">Hajat:</p>
                        <p className="text-sm text-gray-700 italic leading-relaxed">
                          "{donation.hajat_doa}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {onPrintNota && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPrintNota(donation)}
                        className="h-8 text-xs flex-1 border-gray-200"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" />
                        Print Nota
                      </Button>
                    )}
                    {onEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-gray-200">
                            <span className="sr-only">Menu</span>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(donation)}>
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HajatHariIni;

