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
  Loader2,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [newUserData, setNewUserData] = useState({ email: "", password: "", fullName: "", role: "comercial" as AppRole });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: currentUserRole } = useAuth();

  const isAdmin = currentUserRole === "admin" || currentUserRole === "gerente_geral";

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

  // Create user mutation (using admin signup via edge function would be ideal, but for now we'll create via standard signup)
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUserData) => {
      // First, sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Assign role immediately
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role: data.role });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Usuário criado com sucesso!",
        description: "O usuário receberá um email de confirmação.",
      });
      setCreateDialogOpen(false);
      setNewUserData({ email: "", password: "", fullName: "", role: "comercial" });
    },
    onError: (error: any) => {
      let message = error.message;
      if (message.includes("already registered")) {
        message = "Este email já está cadastrado.";
      }
      toast({
        title: "Erro ao criar usuário",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
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

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Permissão removida com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao remover permissão", variant: "destructive" }),
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
          {isAdmin && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-copper hover:opacity-90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Crie um usuário e atribua uma permissão inicial
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input 
                      value={newUserData.fullName} 
                      onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })} 
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={newUserData.email} 
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} 
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha Inicial</Label>
                    <Input 
                      type="password"
                      value={newUserData.password} 
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} 
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissão</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value) => setNewUserData({ ...newUserData, role: value as AppRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => createUserMutation.mutate(newUserData)}
                    disabled={!newUserData.email || !newUserData.password || newUserData.password.length < 6 || createUserMutation.isPending}
                    className="bg-gradient-copper hover:opacity-90"
                  >
                    {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
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
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && user.role && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRoleMutation.mutate(user.id)}
                              disabled={deleteRoleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {isAdmin && (
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
                          )}
                        </div>
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
              1. Clique em <strong>"Novo Usuário"</strong> acima para criar uma conta para o dono do material
            </p>
            <p>
              2. Atribua a role <strong>"Comercial"</strong> para que ele possa ver o estoque e operações
            </p>
            <p>
              3. O usuário receberá um email de confirmação e poderá acessar o sistema
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}