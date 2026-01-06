import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  User,
  Users,
  FileText,
  CreditCard,
  BookOpen,
  HandCoins,
  Activity,
  Shield,
  Edit,
  Eye,
  Download,
  Upload,
  Trash2,
  Archive,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Lock,
  Unlock,
  ChevronRight,
  ExternalLink
} from "lucide-react";

interface SantriSettingsPanelProps {
  santriId: string;
  santriName: string;
  santriCategory: string;
  isOpen: boolean;
  onClose: () => void;
}

const SantriSettingsPanel: React.FC<SantriSettingsPanelProps> = ({
  santriId,
  santriName,
  santriCategory,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('personal');

  const settingsSections = [
    {
      id: 'personal',
      title: 'Data Pribadi',
      description: 'Informasi identitas dan kontak santri',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      items: [
        {
          label: 'Edit Informasi Pribadi',
          description: 'Ubah nama, alamat, kontak, dll',
          icon: Edit,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=personal`);
            onClose();
          }
        },
        {
          label: 'Upload Foto Profil',
          description: 'Ganti foto profil santri',
          icon: Upload,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=photo`);
            onClose();
          }
        },
        {
          label: 'Riwayat Perubahan',
          description: 'Lihat log perubahan data',
          icon: Activity,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&tab=history`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'wali',
      title: 'Data Wali',
      description: 'Informasi wali dan kontak keluarga',
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      items: [
        {
          label: 'Kelola Data Wali',
          description: 'Tambah, edit, atau hapus data wali',
          icon: Edit,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=wali`);
            onClose();
          }
        },
        {
          label: 'Set Wali Utama',
          description: 'Tentukan wali utama untuk kontak',
          icon: Star,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=wali-utama`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'documents',
      title: 'Dokumen',
      description: 'Kelola dokumen dan berkas santri',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      items: [
        {
          label: 'Upload Dokumen',
          description: 'Tambah dokumen baru',
          icon: Upload,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=documents`);
            onClose();
          }
        },
        {
          label: 'Verifikasi Dokumen',
          description: 'Verifikasi kelengkapan dokumen',
          icon: CheckCircle,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&tab=documents&verify=true`);
            onClose();
          }
        },
        {
          label: 'Download Arsip',
          description: 'Download semua dokumen',
          icon: Download,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&action=download`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'academic',
      title: 'Akademik',
      description: 'Program, kelas, dan prestasi santri',
      icon: BookOpen,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      items: [
        {
          label: 'Kelola Program',
          description: 'Tempatkan atau pindahkan program',
          icon: Edit,
          action: () => {
            navigate(`/akademik/kelas?tab=plotting&santriId=${santriId}`);
            onClose();
          }
        },
        {
          label: 'Riwayat Akademik',
          description: 'Lihat riwayat program dan kelas',
          icon: Activity,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&tab=academic-history`);
            onClose();
          }
        },
        {
          label: 'Input Prestasi',
          description: 'Catat prestasi dan pencapaian',
          icon: Star,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&edit=prestasi`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'financial',
      title: 'Keuangan',
      description: 'Tagihan, pembayaran, dan bantuan',
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      items: [
        {
          label: 'Kelola Tagihan',
          description: 'Lihat dan kelola tagihan santri',
          icon: Eye,
          action: () => {
            navigate(`/tagihan-santri?santriId=${santriId}`);
            onClose();
          }
        },
        {
          label: 'Riwayat Pembayaran',
          description: 'Lihat riwayat pembayaran',
          icon: Activity,
          action: () => {
            navigate(`/tagihan-santri?santriId=${santriId}`);
            onClose();
          }
        },
        {
          label: 'Kelola Tabungan',
          description: 'Setor dan tarik tabungan',
          icon: Archive,
          action: () => {
            navigate(`/tabungan?santriId=${santriId}`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'bantuan',
      title: 'Bantuan Yayasan',
      description: 'Pengajuan dan manajemen bantuan yayasan',
      icon: HandCoins,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      items: [
        {
          label: 'Kelola Bantuan Aktif',
          description: 'Monitor dan evaluasi bantuan',
          icon: Eye,
          action: () => {
            navigate(`/keuangan-v3/penyaluran-bantuan?santriId=${santriId}`);
            onClose();
          }
        },
        {
          label: 'Riwayat Bantuan',
          description: 'Lihat riwayat bantuan',
          icon: Activity,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&tab=bantuan-history`);
            onClose();
          }
        }
      ]
    },
    {
      id: 'security',
      title: 'Keamanan',
      description: 'Akses dan izin pengguna',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      items: [
        {
          label: 'Reset Password',
          description: 'Reset password akun santri',
          icon: Lock,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&action=reset-password`);
            onClose();
          }
        },
        {
          label: 'Log Aktivitas',
          description: 'Lihat log akses dan aktivitas',
          icon: Activity,
          action: () => {
            navigate(`/santri/profile?santriId=${santriId}&tab=activity-log`);
            onClose();
          }
        }
      ]
    }
  ];

  const getSectionIcon = (sectionId: string) => {
    const section = settingsSections.find(s => s.id === sectionId);
    return section ? section.icon : Settings;
  };

  const getSectionColor = (sectionId: string) => {
    const section = settingsSections.find(s => s.id === sectionId);
    return section ? section.color : 'text-gray-600';
  };

  const getSectionBgColor = (sectionId: string) => {
    const section = settingsSections.find(s => s.id === sectionId);
    return section ? section.bgColor : 'bg-gray-100';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            Pengaturan Santri
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{santriName}</span>
            <Badge variant="outline">{santriCategory}</Badge>
          </div>
        </DialogHeader>

        <div className="flex gap-6 h-full">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="space-y-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <Button
                    key={section.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 h-auto p-4 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : section.color}`} />
                    <div className="text-left">
                      <div className="font-medium">{section.title}</div>
                      <div className={`text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {section.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator orientation="vertical" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {settingsSections.map((section) => {
                if (activeSection !== section.id) return null;

                const Icon = section.icon;

                return (
                  <div key={section.id} className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`p-3 ${section.bgColor} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${section.color}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{section.title}</h3>
                        <p className="text-muted-foreground">{section.description}</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {section.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        
                        return (
                          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardContent className="p-4">
                              <div 
                                className="flex items-center justify-between"
                                onClick={item.action}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                                    <ItemIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium group-hover:text-primary transition-colors">
                                      {item.label}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SantriSettingsPanel;

