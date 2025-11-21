import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, Calendar, DollarSign, Package, FileText, Heart, 
  MapPin, Phone, Mail, Box, Utensils, X
} from 'lucide-react';
import { Donation } from './DonationHistory';

interface DonationDetailModalProps {
  donation: Donation | null;
  open: boolean;
  onClose: () => void;
  onPrintNota?: (donation: Donation) => void;
}

const DonationDetailModal: React.FC<DonationDetailModalProps> = ({
  donation,
  open,
  onClose,
  onPrintNota
}) => {
  if (!donation) return null;

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

  const getDonationTypeLabel = (type: string) => {
    switch (type) {
      case 'cash':
        return 'Tunai';
      case 'in_kind':
        return 'Barang';
      case 'mixed':
        return 'Campuran';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'posted': { color: 'bg-green-100 text-green-800', label: 'Diposting' },
      'received': { color: 'bg-blue-100 text-blue-800', label: 'Diterima' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Dibatalkan' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
    return <Badge className={config.color} variant="secondary">{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detail Donasi</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Donor Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informasi Donatur
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-700 min-w-[100px]">Nama:</span>
                <span className="text-sm text-gray-900">{donation.donor_name}</span>
              </div>
              {donation.donor_email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-700 min-w-[100px]">Email:</span>
                  <span className="text-sm text-gray-900">{donation.donor_email}</span>
                </div>
              )}
              {donation.donor_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-700 min-w-[100px]">No. HP:</span>
                  <span className="text-sm text-gray-900">{donation.donor_phone}</span>
                </div>
              )}
              {donation.donor_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-700 min-w-[100px]">Alamat:</span>
                  <span className="text-sm text-gray-900">{donation.donor_address}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Donation Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detail Donasi
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 min-w-[120px]">Tanggal:</span>
                <span className="text-sm text-gray-900">{formatDate(donation.donation_date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 min-w-[120px]">Tipe:</span>
                <Badge variant="outline">{getDonationTypeLabel(donation.donation_type)}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 min-w-[120px]">Status:</span>
                {getStatusBadge(donation.status)}
              </div>
              {(donation.donation_type === 'cash' || donation.donation_type === 'mixed') && donation.cash_amount && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">Nominal:</span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(donation.cash_amount)}</span>
                </div>
              )}
              {donation.payment_method && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">Metode:</span>
                  <span className="text-sm text-gray-900">{donation.payment_method}</span>
                </div>
              )}
              {donation.received_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">Diterima:</span>
                  <span className="text-sm text-gray-900">{formatDate(donation.received_date)}</span>
                </div>
              )}
              {donation.posted_to_stock_at && (
                <div className="flex items-center gap-3">
                  <Box className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">Diposting ke Inventaris:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(donation.posted_to_stock_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {donation.posted_to_finance_at && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700 min-w-[120px]">Diposting ke Keuangan:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(donation.posted_to_finance_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {donation.items && donation.items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Daftar Item ({donation.items.length})
                </h3>
                <div className="space-y-2">
                  {donation.items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{item.raw_item_name}</span>
                            {item.item_type === 'inventory' ? (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-2 py-0.5 flex items-center gap-1">
                                <Box className="h-3 w-3" />
                                Inventaris
                              </Badge>
                            ) : item.item_type === 'direct_consumption' ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-2 py-0.5 flex items-center gap-1">
                                <Utensils className="h-3 w-3" />
                                Makanan
                              </Badge>
                            ) : null}
                            {item.is_posted_to_stock && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                ✓ Di Gudang
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            Jumlah: {item.quantity} {item.uom}
                            {item.estimated_value && (
                              <span className="ml-2">• Nilai: {formatCurrency(item.estimated_value * item.quantity)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes & Hajat */}
          {(donation.notes || donation.hajat_doa) && (
            <>
              <Separator />
              <div className="space-y-3">
                {donation.hajat_doa && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-rose-600" />
                      Hajat/Doa
                    </h3>
                    <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                      <p className="text-sm text-gray-900 italic">{donation.hajat_doa}</p>
                    </div>
                  </div>
                )}
                {donation.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Catatan
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-700">{donation.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {onPrintNota && (
              <Button onClick={() => onPrintNota(donation)} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Print Nota
              </Button>
            )}
            <Button onClick={onClose} variant="default" size="sm">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationDetailModal;

