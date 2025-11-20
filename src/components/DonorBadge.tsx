import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Star, Heart, TrendingUp, UtensilsCrossed, Package, Zap } from "lucide-react";

// ================================================
// TYPES
// ================================================
interface DonorProfile {
  donor_tier: string;
  badges?: string[];
  total_cash_amount?: number;
  consecutive_months?: number;
  donor_status?: string;
}

interface DonorBadgeProps {
  profile?: DonorProfile | null;
  showTier?: boolean;
  showBadges?: boolean;
  compact?: boolean;
}

// ================================================
// BADGE CONFIGURATIONS
// ================================================
const TIER_CONFIG = {
  Diamond: {
    label: "Diamond",
    color: "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0",
    icon: Award,
    description: "Donatur Elite - 10M+, 12+ bulan konsisten"
  },
  Platinum: {
    label: "Platinum",
    color: "bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0",
    icon: Award,
    description: "Donatur Istimewa - 5M+, 6+ bulan konsisten"
  },
  Gold: {
    label: "Gold",
    color: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0",
    icon: Award,
    description: "Donatur Setia - 2M+, 3+ bulan konsisten"
  },
  Silver: {
    label: "Silver",
    color: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 border-0",
    icon: Award,
    description: "Donatur Aktif - 500K+, 5+ donasi"
  },
  Bronze: {
    label: "Bronze",
    color: "bg-gradient-to-r from-orange-300 to-orange-400 text-gray-800 border-0",
    icon: Award,
    description: "Donatur Baru"
  }
};

const BADGE_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  CONSISTENT_SUPPORTER: {
    label: "Konsisten",
    color: "border-green-500 text-green-700 bg-green-50",
    icon: Star,
    description: "6+ bulan berturut-turut donasi"
  },
  RELIABLE_PARTNER: {
    label: "Partner Terpercaya",
    color: "border-blue-500 text-blue-700 bg-blue-50",
    icon: TrendingUp,
    description: "12+ bulan berturut-turut donasi"
  },
  FOUNDING_SUPPORTER: {
    label: "Pendukung Awal",
    color: "border-purple-500 text-purple-700 bg-purple-50",
    icon: Heart,
    description: "Donatur sejak > 1 tahun"
  },
  MAJOR_CONTRIBUTOR: {
    label: "Kontributor Besar",
    color: "border-indigo-500 text-indigo-700 bg-indigo-50",
    icon: Zap,
    description: "Donasi tunggal > 5 juta"
  },
  FOOD_HERO: {
    label: "Pahlawan Konsumsi",
    color: "border-orange-500 text-orange-700 bg-orange-50",
    icon: UtensilsCrossed,
    description: "10+ kali donasi makanan"
  },
  ASSET_SUPPORTER: {
    label: "Pendukung Aset",
    color: "border-cyan-500 text-cyan-700 bg-cyan-50",
    icon: Package,
    description: "10+ kali donasi barang"
  },
  STREAK_MASTER: {
    label: "Streak Master",
    color: "border-red-500 text-red-700 bg-red-50",
    icon: TrendingUp,
    description: "18+ bulan berturut-turut"
  }
};

// ================================================
// COMPONENT
// ================================================
export default function DonorBadge({ 
  profile, 
  showTier = true, 
  showBadges = true,
  compact = false 
}: DonorBadgeProps) {
  if (!profile) return null;

  const tierConfig = TIER_CONFIG[profile.donor_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.Bronze;
  const badges = profile.badges || [];

  if (compact) {
    // Compact mode: only show tier icon
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`${tierConfig.color} text-xs`}>
              {tierConfig.label.split(' ')[0]} {/* Only emoji */}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{tierConfig.label}</p>
            <p className="text-xs">{tierConfig.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Tier Badge */}
      {showTier && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className={tierConfig.color}>
                <tierConfig.icon className="w-3 h-3 mr-1" />
                {tierConfig.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">{tierConfig.label}</p>
                <p className="text-xs">{tierConfig.description}</p>
                {profile.total_cash_amount && (
                  <p className="text-xs">
                    Total: Rp {profile.total_cash_amount.toLocaleString('id-ID')}
                  </p>
                )}
                {profile.consecutive_months && profile.consecutive_months > 0 && (
                  <p className="text-xs">
                    {profile.consecutive_months} bulan konsisten
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Achievement Badges */}
      {showBadges && badges.length > 0 && badges.slice(0, 3).map((badgeCode) => {
        const badgeConfig = BADGE_CONFIG[badgeCode];
        if (!badgeConfig) return null;

        return (
          <TooltipProvider key={badgeCode}>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className={`${badgeConfig.color} text-xs`}>
                  <badgeConfig.icon className="w-3 h-3 mr-1" />
                  {badgeConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{badgeConfig.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {/* Show +N more if there are more badges */}
      {showBadges && badges.length > 3 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs">
                +{badges.length - 3}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold text-xs">Badge Lainnya:</p>
                {badges.slice(3).map((badgeCode) => {
                  const badgeConfig = BADGE_CONFIG[badgeCode];
                  return badgeConfig ? (
                    <p key={badgeCode} className="text-xs">• {badgeConfig.label}</p>
                  ) : null;
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ================================================
// STATUS INDICATOR COMPONENT
// ================================================
interface DonorStatusProps {
  status: string;
  days: number;
}

export function DonorStatus({ status, days }: DonorStatusProps) {
  const statusConfig = {
    Active: { color: "bg-green-100 text-green-800", label: "Aktif", icon: "●" },
    Recent: { color: "bg-blue-100 text-blue-800", label: "Baru-baru", icon: "●" },
    Lapsed: { color: "bg-yellow-100 text-yellow-800", label: "Lapsed", icon: "●" },
    Inactive: { color: "bg-gray-100 text-gray-800", label: "Tidak Aktif", icon: "●" }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Inactive;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`${config.color} text-xs`}>
            {config.icon} {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Donasi terakhir: {days} hari lalu</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

