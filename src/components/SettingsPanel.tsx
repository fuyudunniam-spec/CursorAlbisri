import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Shield,
  FileText,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const uiFont: React.CSSProperties = {
  fontFamily:
    '"Plus Jakarta Sans","Manrope","DM Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
};

export interface SettingsMenuItem {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  menuItems?: {
    account?: SettingsMenuItem[];
    preferences?: SettingsMenuItem[];
    help?: SettingsMenuItem[];
  };
  showLogout?: boolean;
  onLogout?: () => void | Promise<void>;
  customSections?: Array<{
    title: string;
    items: SettingsMenuItem[];
  }>;
  profileCompletionStatus?: {
    isComplete: boolean;
    completionPercentage: number;
    missingFieldsCount: number;
  };
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-1 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {title}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-4 text-left",
        "hover:bg-slate-50",
        "disabled:cursor-default disabled:hover:bg-transparent"
      )}
      disabled={!onClick}
      type="button"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {right}
        {onClick ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
      </div>
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-slate-200/70" />;
}

export default function SettingsPanel({
  open,
  onClose,
  title = "Pengaturan",
  menuItems,
  showLogout = false,
  onLogout,
  customSections,
  profileCompletionStatus,
}: SettingsPanelProps) {
  const nav = useNavigate();

  // Default menu items if not provided
  const defaultMenuItems = {
    account: [
      {
        icon: <User className="h-5 w-5" />,
        title: "Profil",
        subtitle: "Kelola data santri",
        onClick: () => {
          onClose();
        },
      },
      {
        icon: <Shield className="h-5 w-5" />,
        title: "Keamanan",
        subtitle: "Kata sandi & akses",
        onClick: () => {
          nav("/change-password");
          onClose();
        },
      },
    ],
    preferences: [
      {
        icon: <FileText className="h-5 w-5" />,
        title: "Dokumen",
        subtitle: "Kelola dokumen santri",
        onClick: () => {
          onClose();
        },
      },
    ],
    help: [
      {
        icon: <Info className="h-5 w-5" />,
        title: "Tentang Aplikasi",
        subtitle: "Versi, kebijakan, lisensi",
        onClick: () => {
          toast.info("Informasi aplikasi akan segera tersedia");
        },
      },
    ],
  };

  const accountItems = menuItems?.account ?? defaultMenuItems.account;
  const preferencesItems = menuItems?.preferences ?? defaultMenuItems.preferences;
  const helpItems = menuItems?.help ?? defaultMenuItems.help;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background Overlay - Solid */}
      <div
        className="fixed inset-0 bg-[#FAFAF7]"
        onClick={onClose}
      />

      {/* Settings Content */}
      <div
        className="relative min-h-screen pb-10 bg-[#FAFAF7]"
        style={uiFont}
      >
        {/* Premium Islamic light background */}
        <div className="fixed inset-0 -z-10 bg-[#FAFAF7]" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.10),transparent_52%)]" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(201,162,74,0.06),transparent_45%)]" />

        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-transparent">
          <div className="mx-auto max-w-md px-4 pt-3">
            <div className="relative flex items-center justify-between">
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-white/70"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-slate-800">
                {title}
              </div>

              <div className="h-10 w-10" />
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="mx-auto max-w-md px-5 pt-2 pb-20">
          {/* Profile Completion Notification */}
          {profileCompletionStatus && !profileCompletionStatus.isComplete && (
            <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-amber-900 mb-1">
                    Profil Belum Lengkap
                  </div>
                  <div className="text-xs text-amber-700 mb-2">
                    Silakan lengkapi {profileCompletionStatus.missingFieldsCount} data yang masih kosong untuk melengkapi profil Anda.
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-1.5">
                    <div 
                      className="bg-amber-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${profileCompletionStatus.completionPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-amber-600 mt-1 text-right">
                    {Math.round(profileCompletionStatus.completionPercentage)}% Lengkap
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Section */}
          {accountItems.length > 0 && (
            <>
              <SectionHeader title="Akun" />
              <Card>
                {accountItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <Row
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      right={item.right}
                      onClick={item.onClick}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </>
          )}

          {/* Preferences Section */}
          {preferencesItems.length > 0 && (
            <>
              <SectionHeader title="Preferensi" />
              <Card>
                {preferencesItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <Row
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      right={item.right}
                      onClick={item.onClick}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </>
          )}

          {/* Custom Sections */}
          {customSections?.map((section, sectionIndex) => (
            <React.Fragment key={sectionIndex}>
              <SectionHeader title={section.title} />
              <Card>
                {section.items.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <Row
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      right={item.right}
                      onClick={item.onClick}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </React.Fragment>
          ))}

          {/* Help Section */}
          {helpItems.length > 0 && (
            <>
              <SectionHeader title="Bantuan" />
              <Card>
                {helpItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <Row
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      right={item.right}
                      onClick={item.onClick}
                    />
                  </React.Fragment>
                ))}
              </Card>
            </>
          )}

          {/* Footer Text */}
          <div className="mt-6 text-center text-[11px] text-slate-400">
            Pengaturan tersimpan sesuai kebijakan aplikasi.
          </div>

          {/* Logout Button - Fixed at Bottom */}
          {showLogout && onLogout && (
            <div className="fixed bottom-0 left-0 right-0 bg-[#FAFAF7] border-t border-slate-200/70 p-4 z-40">
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  try {
                    await onLogout();
                  } catch (error) {
                    console.error("Error during logout:", error);
                  }
                }}
                className="w-full rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-rose-600 shadow-[0_10px_26px_rgba(15,23,42,0.06)] ring-1 ring-rose-200/60 hover:bg-rose-50"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

