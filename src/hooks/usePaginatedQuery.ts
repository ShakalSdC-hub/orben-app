import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedQueryOptions {
  queryKey: string[];
  tableName: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
}

export interface PaginatedQueryResult<T> {
  data: T[];
  pagination: PaginationState;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
}

export function usePaginatedQuery<T>({
  queryKey,
  tableName,
  select = "*",
  filters,
  orderBy = { column: "created_at", ascending: false },
  pageSize: initialPageSize = 50,
  enabled = true,
}: PaginatedQueryOptions): PaginatedQueryResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Contar total de registros
  const { data: countData } = useQuery({
    queryKey: [...queryKey, "count", JSON.stringify(filters)],
    queryFn: async () => {
      let query = supabase
        .from(tableName as any)
        .select("*", { count: "exact", head: true });

      // Aplicar filtros simples
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value) as any;
          }
        });
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled,
  });

  const totalCount = countData || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Buscar dados paginados
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKey, page, pageSize, JSON.stringify(filters)],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from(tableName as any)
        .select(select)
        .range(from, to)
        .order(orderBy.column, { ascending: orderBy.ascending ?? false });

      // Aplicar filtros simples
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value) as any;
          }
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as T[]) || [];
    },
    enabled,
  });

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page
  }, []);

  const pagination: PaginationState = useMemo(() => ({
    page,
    pageSize,
    totalCount,
    totalPages,
  }), [page, pageSize, totalCount, totalPages]);

  return {
    data: data || [],
    pagination,
    isLoading,
    isFetching,
    error: error as Error | null,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
    refetch,
  };
}

// Componente de paginação reutilizável
export { PaginationControls } from "@/components/ui/PaginationControls";
