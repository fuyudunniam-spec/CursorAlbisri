import { useQuery } from "@tanstack/react-query";
import { getLowStock, getNearExpiry } from "@/services/inventaris.service";

export function useStockAlerts() {
  const lowStockQuery = useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: () => getLowStock(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  const nearExpiryQuery = useQuery({
    queryKey: ["inventory-near-expiry"],
    queryFn: () => getNearExpiry(30),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  return {
    lowStockItems: lowStockQuery.data || [],
    nearExpiryItems: nearExpiryQuery.data || [],
    isLoading: lowStockQuery.isLoading || nearExpiryQuery.isLoading,
    error: lowStockQuery.error || nearExpiryQuery.error,
    refetch: () => {
      lowStockQuery.refetch();
      nearExpiryQuery.refetch();
    }
  };
}
