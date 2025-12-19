import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  FileInput,
  MoreHorizontal,
  Eye,
  Edit,
  Printer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ROMEntrada {
  id: string;
  fornecedor: string;
  procedencia?: string;
  dataEntrada: string;
  nf?: string;
  pesoTotalKg: number;
  qtdVolumes: number;
  tipoMaterial: string;
  status: "pendente" | "conferido" | "processando" | "finalizado";
  dono: string;
}

const romsEntrada: ROMEntrada[] = [
  {
    id: "ROM-ENT-2024-0156",
    fornecedor: "Reciclagem São Paulo",
    procedencia: "João Ferreira (informal)",
    dataEntrada: "18/12/2024",
    nf: "NF-12345",
    pesoTotalKg: 5200,
    qtdVolumes: 12,
    tipoMaterial: "Mel + Mista",
    status: "conferido",
    dono: "IBRAC",
  },
  {
    id: "ROM-ENT-2024-0155",
    fornecedor: "Cobre Sul Ltda",
    dataEntrada: "18/12/2024",
    nf: "NF-12344",
    pesoTotalKg: 3800,
    qtdVolumes: 8,
    tipoMaterial: "Mel",
    status: "processando",
    dono: "IBRAC",
  },
  {
    id: "ROM-ENT-2024-0154",
    fornecedor: "Metal Norte",
    procedencia: "Renato - Parceiro",
    dataEntrada: "17/12/2024",
    pesoTotalKg: 6100,
    qtdVolumes: 15,
    tipoMaterial: "Mista",
    status: "pendente",
    dono: "Renato",
  },
  {
    id: "ROM-ENT-2024-0153",
    fornecedor: "Sucatas BR",
    dataEntrada: "17/12/2024",
    nf: "NF-12340",
    pesoTotalKg: 4200,
    qtdVolumes: 10,
    tipoMaterial: "Mel",
    status: "finalizado",
    dono: "IBRAC",
  },
  {
    id: "ROM-ENT-2024-0152",
    fornecedor: "Cooper Metais",
    dataEntrada: "16/12/2024",
    nf: "NF-12338",
    pesoTotalKg: 7500,
    qtdVolumes: 18,
    tipoMaterial: "Mel + Mista",
    status: "finalizado",
    dono: "IBRAC",
  },
];

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  conferido: { label: "Conferido", className: "bg-primary/10 text-primary border-primary/20" },
  processando: { label: "Processando", className: "bg-copper/10 text-copper border-copper/20" },
  finalizado: { label: "Finalizado", className: "bg-success/10 text-success border-success/20" },
};

export default function RomEntrada() {
  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg}kg`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ROM de Entrada</h1>
            <p className="text-muted-foreground">
              Gerenciamento de ordens de recebimento de material
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importar XML
            </Button>
            <Button size="sm" className="bg-gradient-copper hover:opacity-90 shadow-copper">
              <Plus className="mr-2 h-4 w-4" />
              Nova ROM
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ROM, fornecedor..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">ROM</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">NF</TableHead>
                <TableHead className="font-semibold text-right">Peso</TableHead>
                <TableHead className="font-semibold text-center">Volumes</TableHead>
                <TableHead className="font-semibold">Material</TableHead>
                <TableHead className="font-semibold">Dono</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {romsEntrada.map((rom) => (
                <TableRow key={rom.id} className="group hover:bg-muted/30 cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                        <FileInput className="h-4 w-4 text-success" />
                      </div>
                      <span className="font-medium text-sm">{rom.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{rom.fornecedor}</p>
                      {rom.procedencia && (
                        <p className="text-xs text-muted-foreground">{rom.procedencia}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{rom.dataEntrada}</TableCell>
                  <TableCell className="text-sm">
                    {rom.nf || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatWeight(rom.pesoTotalKg)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-medium">
                      {rom.qtdVolumes}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{rom.tipoMaterial}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {rom.dono}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusConfig[rom.status].className)}
                    >
                      {statusConfig[rom.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir Romaneio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
