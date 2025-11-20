import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryFilters,
  type Pagination,
  type Sort,
} from "@/services/inventaris.service";

export function useInventoryList(pagination: Pagination, filters: InventoryFilters, sort: Sort) {
  return useQuery({
    queryKey: ["inventory", pagination, filters, sort],
    queryFn: () => listInventory(pagination, filters, sort),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: ["inventory-item", id],
    queryFn: () => {
      if (!id) return Promise.resolve(null);
      return getInventoryItem(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => updateInventoryItem(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-item", id] });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}


