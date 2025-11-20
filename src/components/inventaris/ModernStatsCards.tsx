import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { formatRupiah } from "@/utils/inventaris.utils";

type StatCard = {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon: React.ReactNode;
  color: string;
  description?: string;
};

type Props = {
  totalItems: number;
  totalTransactions: number;
  totalValue: number;
  alertsCount: number;
  lowStockCount: number;
  nearExpiryCount: number;
  loading?: boolean;
};

const ModernStatsCards = memo(({ 
  totalItems, 
  totalTransactions, 
  totalValue, 
  alertsCount, 
  lowStockCount, 
  nearExpiryCount,
  loading = false 
}: Props) => {
  const stats: StatCard[] = [
    {
      title: "Total Item",
      value: totalItems,
      icon: <Package className="h-5 w-5" />,
      color: "text-blue-600",
      description: "Barang dalam inventaris"
    },
    {
      title: "Total Transaksi",
      value: totalTransactions,
      icon: <Activity className="h-5 w-5" />,
      color: "text-green-600",
      description: "Transaksi bulan ini"
    },
    {
      title: "Total Nilai",
      value: formatRupiah(totalValue),
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-purple-600",
      description: "Nilai total inventaris"
    },
    {
      title: "Peringatan",
      value: alertsCount,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-orange-600",
      description: `${lowStockCount} stok rendah, ${nearExpiryCount} kedaluwarsa`
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`${stat.color} transition-colors duration-300`}>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <p className="text-xs text-gray-500">
              {stat.description}
            </p>
            {stat.change !== undefined && (
              <div className="flex items-center mt-2">
                <Badge 
                  variant={stat.changeType === "increase" ? "default" : stat.changeType === "decrease" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {stat.changeType === "increase" ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : stat.changeType === "decrease" ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : null}
                  {stat.change > 0 ? "+" : ""}{stat.change}%
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

ModernStatsCards.displayName = "ModernStatsCards";

export default ModernStatsCards;
