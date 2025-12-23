import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PaginationState } from "@/hooks/usePaginatedQuery";

interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
}

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  pageSizeOptions = [25, 50, 100, 200],
}: PaginationControlsProps) {
  const { page, pageSize, totalCount, totalPages } = pagination;
  
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      {/* Info de registros */}
      <div className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          "Nenhum registro encontrado"
        ) : (
          <>
            Mostrando <span className="font-medium">{startItem}</span> a{" "}
            <span className="font-medium">{endItem}</span> de{" "}
            <span className="font-medium">{totalCount}</span> registros
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Seletor de tamanho de página */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controles de navegação */}
        <div className="flex items-center gap-1">
          {/* Primeira página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Primeira página</span>
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Página anterior</span>
          </Button>

          {/* Indicador de página */}
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-muted-foreground">Página</span>
            <span className="text-sm font-medium">{page}</span>
            <span className="text-sm text-muted-foreground">de</span>
            <span className="text-sm font-medium">{totalPages || 1}</span>
          </div>

          {/* Próxima página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Próxima página</span>
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Última página</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
