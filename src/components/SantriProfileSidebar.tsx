import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Users, 
  FileText, 
  BookOpen, 
  DollarSign, 
  HandCoins, 
  Activity,
  Eye,
  Calendar,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  Edit,
  Plus,
  GraduationCap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { formatDate } from "@/utils/inventaris.utils";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  required?: boolean;
  category?: string;
}

interface SantriProfileSidebarProps {
  santri?: any;
  activeTab: string;
  mode: 'view' | 'edit' | 'add';
  onTabChange: (tabId: string) => void;
  onEditMode?: () => void;
  onAddMode?: () => void;
}

const SantriProfileSidebar: React.FC<SantriProfileSidebarProps> = ({
  santri,
  activeTab,
  mode,
  onTabChange,
  onEditMode,
  onAddMode,
}) => {
  const generateInitials = (name: string) => {
    if (!name || name.trim() === '') return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isBinaan = santri?.kategori?.includes('Binaan') || false;
  const isMukim = santri?.kategori === 'Binaan Mukim';
  const isBantuanRecipient = isBinaan || santri?.tipe_pembayaran === 'Bantuan Yayasan';

  // Define sidebar items based on mode and santri category
  const getSidebarItems = (): SidebarItem[] => {
    // 4 tab utama: Data Pribadi (gabung pribadi+wali+pendidikan+kesehatan), Akademik, Keuangan, Dokumen
    const baseItems: SidebarItem[] = [
      { id: 'personal', label: 'Data Pribadi', icon: User, required: true },
      { id: 'akademik', label: 'Akademik', icon: BookOpen, required: false },
      { id: 'keuangan', label: 'Keuangan', icon: DollarSign, required: false },
      { id: 'dokumen', label: 'Dokumen', icon: FileText, required: true },
    ];

    // Add Bantuan Yayasan tab for Binaan kategori
    if (isBinaan) {
      baseItems.splice(3, 0, { id: 'bantuan', label: 'Bantuan Yayasan', icon: HandCoins, required: false });
    }

    return baseItems;
  };

  const sidebarItems = getSidebarItems();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Aktif":
        return "bg-green-100 text-green-800 border-green-200";
      case "Non Aktif":
      case "NonAktif":
        return "bg-red-100 text-red-800 border-red-200";
      case "Cuti":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Lulus":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCompletionStatus = (tabId: string) => {
    if (!santri) return 'incomplete';
    
    switch (tabId) {
      case 'personal':
        return santri.nama_lengkap && santri.tanggal_lahir && santri.no_whatsapp ? 'complete' : 'incomplete';
      case 'wali':
        return santri.wali_data?.length > 0 ? 'complete' : 'incomplete';
      case 'dokumen':
        return santri.dokumen_data?.length > 0 ? 'complete' : 'incomplete';
      case 'akademik':
        return santri.program_data?.length > 0 ? 'complete' : 'incomplete';
      case 'keuangan':
        return isBantuanRecipient ? 'complete' : (santri.tagihan_data?.length > 0 ? 'complete' : 'incomplete');
      default:
        return 'complete';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Profile Header */}
      <div className="p-6 border-b border-gray-200">
        {mode === 'add' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Tambah Santri Baru</h3>
            <p className="text-sm text-gray-600">Lengkapi data santri baru</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="relative mb-4">
              <Avatar className="w-20 h-20 mx-auto border-2 border-gray-200">
                <AvatarImage src={getSafeAvatarUrl(santri?.foto_profil)} />
                <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-700">
                  {generateInitials(santri?.nama_lengkap || '')}
                </AvatarFallback>
              </Avatar>
              {isBantuanRecipient && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <HandCoins className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {santri?.nama_lengkap || 'Nama Santri'}
            </h3>
             <p className="text-sm text-gray-600">ID: {santri?.id_santri || 'Belum ada'}</p>
            
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <Badge className={cn("text-xs px-2 py-1", getStatusBadgeColor((santri?.status_santri || santri?.status_baru) || ''))}>
                {santri?.status_santri || santri?.status_baru || 'Status'}
              </Badge>
              <Badge variant="outline" className="text-xs px-2 py-1">
                {santri?.kategori || 'Kategori'}
              </Badge>
            </div>

            {/* Quick Info */}
            {santri && (
              <div className="mt-4 space-y-2 text-xs text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : 'Umur belum diisi'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Phone className="w-3 h-3" />
                  <span>{santri.no_whatsapp || 'WhatsApp belum diisi'}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{santri.alamat || 'Alamat belum diisi'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode Actions */}
        {mode === 'view' && (
          <div className="mt-4 space-y-2">
            <Button 
              onClick={onEditMode}
              className="w-full"
              size="sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profil
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            const completionStatus = getCompletionStatus(item.id);
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3",
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "hover:bg-gray-100 text-gray-700"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <div className="flex items-center w-full">
                  <item.icon className={cn(
                    "w-4 h-4 mr-3 flex-shrink-0",
                    isActive ? "text-white" : "text-gray-500"
                  )} />
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.required && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs px-1 py-0 h-4",
                            completionStatus === 'complete' 
                              ? "bg-green-100 text-green-800 border-green-200" 
                              : "bg-red-100 text-red-800 border-red-200"
                          )}
                        >
                          {completionStatus === 'complete' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold mb-1">Kategori: {santri?.kategori || 'Belum dipilih'}</p>
              <p className="mb-2">
                {isBinaan ? '✓ Penerima Bantuan Yayasan' : '💳 Pembayaran Mandiri'}
              </p>
              {isMukim && (
                <p className="text-blue-600">🏠 Mukim - Data Lengkap</p>
              )}
              {santri?.kategori === 'Binaan Non-Mukim' && (
                <p className="text-green-600">🏠 Non-Mukim - Data Minimal</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>Mode: <span className="font-medium capitalize">{mode}</span></p>
          {santri && (
            <p>Terakhir diupdate: {formatDate(santri.updated_at || santri.created_at)}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SantriProfileSidebar;
