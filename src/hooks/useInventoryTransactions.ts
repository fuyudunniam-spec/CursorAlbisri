import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactions,
  type Pagination,
  type Sort,
  type TransactionFilters,
} from "@/services/inventaris.service";

export function useInventoryTransactions(
  pagination: Pagination,
  filters: TransactionFilters,
  sort: Sort
) {
  return useQuery({
    queryKey: ["inventory-transactions", pagination, filters, sort],
    queryFn: () => listTransactions(pagination, filters, sort),
    staleTime: 15_000,
    keepPreviousData: true,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateTransaction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => updateTransaction(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useDeleteTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTransactions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}


