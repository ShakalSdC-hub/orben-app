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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Package,
  DollarSign,
  Truck,
  Factory,
  BarChart3,
  Settings,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "gerente_geral" | "financeiro" | "compras" | "pcp" | "comercial" | "expedicao";

const roleConfig: Record<AppRole, { label: string; color: string; icon: React.ReactNode; permissions: string[] }> = {
  admin: {
    label: "Administrador",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <ShieldAlert className="h-4 w-4" />,
    permissions: ["Acesso total ao sistema", "Gerenciar usuários", "Configurações"],
  },
  gerente_geral: {
    label: "Gerente Geral",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: <ShieldCheck className="h-4 w-4" />,
    permissions: ["Visualizar tudo", "Gerenciar cadastros", "Aprovar operações"],
  },
  financeiro: {
    label: "Financeiro",
    color: "bg-success/10 text-success border-success/20",
    icon: <DollarSign className="h-4 w-4" />,
    permissions: ["Acertos financeiros", "Relatórios financeiros", "Comparativo fiscal"],
  },
  compras: {
    label: "Compras",
    color: "bg-copper/10 text-copper border-copper/20",
    icon: <Package className="h-4 w-4" />,
    permissions: ["Entradas", "Fornecedores", "Cotações LME"],
  },
  pcp: {
    label: "PCP",
    color: "bg-warning/10 text-warning border-warning/20",
    icon: <Factory className="h-4 w-4" />,
    permissions: ["Beneficiamentos", "Movimentações", "Estoque"],
  },
  comercial: {
    label: "Comercial",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: <BarChart3 className="h-4 w-4" />,
    permissions: ["Saídas", "Clientes", "Simulações"],
  },
  expedicao: {
    label: "Expedição",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: <Truck className="h-4 w-4" />,
    permissions: ["Saídas", "Movimentações", "Estoque (visualização)"],
  },
};

export default function Permissoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with profiles and roles
  const { data: usersWithRoles, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      return profiles.map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.id)?.role as AppRole | undefined,
      }));
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Permissão atualizada",
        description: "A role do usuário foi atualizada com sucesso.",
      });
      setDialogOpen(false);
      setSelectedUserId(null);
      setSelectedRole(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = usersWithRoles?.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignRole = () => {
    if (selectedUserId && selectedRole) {
      assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
            <p className="text-muted-foreground">
              Gerencie os acessos e permissões dos usuários do sistema
            </p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(roleConfig).slice(0, 4).map(([role, config]) => (
            <Card key={role} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.color)}>
                    {config.icon}
                  </div>
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {config.permissions.map((perm, idx) => (
                    <li key={idx} className="flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription>
                  Atribua permissões aos usuários cadastrados
                </CardDescription>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role Atual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {user.full_name || "Sem nome"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <Badge variant="outline" className={cn("text-xs", roleConfig[user.role]?.color)}>
                            {roleConfig[user.role]?.icon}
                            <span className="ml-1">{roleConfig[user.role]?.label}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            <Eye className="h-3 w-3 mr-1" />
                            Sem permissão
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={dialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) {
                            setSelectedUserId(null);
                            setSelectedRole(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setSelectedRole(user.role || null);
                                setDialogOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Atribuir Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atribuir Permissão</DialogTitle>
                              <DialogDescription>
                                Selecione a role para {user.full_name || user.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={selectedRole || ""}
                                  onValueChange={(value) => setSelectedRole(value as AppRole)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(roleConfig).map(([role, config]) => (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center gap-2">
                                          {config.icon}
                                          <span>{config.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedRole && (
                                <div className="rounded-lg border p-3 bg-muted/30">
                                  <p className="text-sm font-medium mb-2">Permissões:</p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {roleConfig[selectedRole].permissions.map((perm, idx) => (
                                      <li key={idx}>• {perm}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button
                                onClick={handleAssignRole}
                                disabled={!selectedRole || assignRoleMutation.isPending}
                                className="bg-gradient-copper hover:opacity-90"
                              >
                                {assignRoleMutation.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Salvar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredUsers || filteredUsers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado ainda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Instructions for Material Owners */}
        <Card className="border-copper/30 bg-copper/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-copper">
              <Shield className="h-5 w-5" />
              Compartilhar com Donos de Material
            </CardTitle>
            <CardDescription>
              Como dar acesso aos donos de material para acompanhar seu estoque
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              1. Peça para o dono do material criar uma conta no sistema usando o email dele
            </p>
            <p>
              2. Após o cadastro, volte aqui e atribua a role <strong>"Comercial"</strong> ou <strong>"Visualizador"</strong>
            </p>
            <p>
              3. O usuário poderá ver apenas o estoque e operações relacionadas ao seu material
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
