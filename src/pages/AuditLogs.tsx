import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FileText,
  Loader2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  User,
  Database,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Json } from "@/integrations/supabase/types";

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  insert: {
    label: "Criação",
    color: "bg-success/10 text-success border-success/20",
    icon: <Plus className="h-3 w-3" />,
  },
  update: {
    label: "Atualização",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: <Pencil className="h-3 w-3" />,
  },
  delete: {
    label: "Exclusão",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <Trash2 className="h-3 w-3" />,
  },
};

const tableLabels: Record<string, string> = {
  parceiros: "Parceiros",
  donos_material: "Donos de Material",
  entradas: "Entradas",
  saidas: "Saídas",
  acertos_financeiros: "Acertos Financeiros",
  transferencias_dono: "Transferências de Dono",
};

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  record_data: Json;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { role } = useAuth();

  const isAdmin = role === "admin";

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["audit-logs", filterTable, filterAction],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterTable && filterTable !== "all") {
        query = query.eq("table_name", filterTable);
      }
      if (filterAction && filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: isAdmin,
  });

  // Fetch user profiles for display
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sistema";
    const profile = profiles?.find((p) => p.id === userId);
    return profile?.full_name || profile?.email || "Desconhecido";
  };

  const filteredLogs = logs?.filter((log) =>
    log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserName(log.user_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const renderRecordData = (data: Json) => {
    if (!data) return null;
    try {
      return (
        <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-muted-foreground">Dados não disponíveis</span>;
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-warning" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Apenas administradores podem visualizar os logs de auditoria.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
            <p className="text-muted-foreground">
              Monitore todas as alterações em dados sensíveis do sistema
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Registros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-success" /> Criações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {logs?.filter((l) => l.action === "insert").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Pencil className="h-4 w-4 text-warning" /> Atualizações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {logs?.filter((l) => l.action === "update").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" /> Exclusões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {logs?.filter((l) => l.action === "delete").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Histórico de Alterações
                </CardTitle>
                <CardDescription>
                  Logs são mantidos por 90 dias e depois removidos automaticamente
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-48"
                  />
                </div>
                <Select value={filterTable} onValueChange={setFilterTable}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Tabela" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tabelas</SelectItem>
                    {Object.entries(tableLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-full md:w-36">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {Object.entries(actionConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(log.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                              <User className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-medium">
                              {getUserName(log.user_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              actionConfig[log.action]?.color || "bg-muted"
                            )}
                          >
                            {actionConfig[log.action]?.icon}
                            <span className="ml-1">
                              {actionConfig[log.action]?.label || log.action}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {tableLabels[log.table_name] || log.table_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes do Log
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                    <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                    <p className="text-sm">{getUserName(selectedLog.user_id)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ação</p>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", actionConfig[selectedLog.action]?.color)}
                    >
                      {actionConfig[selectedLog.action]?.icon}
                      <span className="ml-1">
                        {actionConfig[selectedLog.action]?.label || selectedLog.action}
                      </span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tabela</p>
                    <p className="text-sm">
                      {tableLabels[selectedLog.table_name] || selectedLog.table_name}
                    </p>
                  </div>
                  {selectedLog.record_id && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">ID do Registro</p>
                      <p className="text-sm font-mono">{selectedLog.record_id}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Dados do Registro
                  </p>
                  {renderRecordData(selectedLog.record_data)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
