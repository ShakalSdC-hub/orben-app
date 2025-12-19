import { Bell, Search, User, LogOut, Package, Factory, FileOutput, FileInput, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operacao: "Operação",
  financeiro: "Financeiro",
  dono: "Dono Material",
};

export function Header() {
  const { profile, role, signOut } = useAuth();

  // Buscar atividades recentes para notificações
  const { data: recentActivities, isLoading } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const [entradas, saidas, beneficiamentos] = await Promise.all([
        supabase
          .from("entradas")
          .select("id, codigo, created_at, tipo_material")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("saidas")
          .select("id, codigo, created_at, tipo_saida")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("beneficiamentos")
          .select("id, codigo, created_at, status")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      
      const activities = [
        ...(entradas.data || []).map((e) => ({
          id: e.id,
          type: "entrada" as const,
          codigo: e.codigo,
          created_at: e.created_at,
          label: `Nova entrada: ${e.codigo}`,
        })),
        ...(saidas.data || []).map((s) => ({
          id: s.id,
          type: "saida" as const,
          codigo: s.codigo,
          created_at: s.created_at,
          label: `Nova saída: ${s.codigo}`,
        })),
        ...(beneficiamentos.data || []).map((b) => ({
          id: b.id,
          type: "beneficiamento" as const,
          codigo: b.codigo,
          created_at: b.created_at,
          label: `Beneficiamento: ${b.codigo}`,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return activities.slice(0, 5);
    },
    refetchInterval: 60000, // Atualizar a cada 1 min
  });

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Usuário";
  const roleLabel = role ? roleLabels[role] || role : "Sem perfil";
  const notificationCount = recentActivities?.length || 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "entrada": return <FileInput className="h-4 w-4 text-success" />;
      case "saida": return <FileOutput className="h-4 w-4 text-destructive" />;
      case "beneficiamento": return <Factory className="h-4 w-4 text-copper" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar entrada, lote, fornecedor..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {notificationCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-destructive border-2 border-background">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b">
                <h4 className="font-semibold text-sm">Atividades Recentes</h4>
              </div>
              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : recentActivities && recentActivities.length > 0 ? (
                  <div className="divide-y">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma atividade recente</p>
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-copper">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
