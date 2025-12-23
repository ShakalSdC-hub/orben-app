import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "dono" | "operacao" | "financeiro";

// Configuração de permissões por rota
const routePermissions: Record<string, AppRole[]> = {
  // Rotas públicas para qualquer usuário autenticado com role
  "/": ["admin", "dono", "operacao", "financeiro"],
  "/estoque": ["admin", "dono", "operacao", "financeiro"],
  "/indicadores": ["admin", "dono", "operacao", "financeiro"],
  
  // Rotas operacionais
  "/entrada": ["admin", "operacao"],
  "/beneficiamento": ["admin", "operacao"],
  "/saida": ["admin", "operacao"],
  "/cadastros": ["admin", "operacao"],
  
  // Rotas financeiras
  "/financeiro": ["admin", "financeiro"],
  "/simulador": ["admin", "financeiro", "operacao"],
  "/relatorios": ["admin", "financeiro", "dono"],
  "/extrato-dono": ["admin", "financeiro", "dono"],
  
  // Rotas administrativas
  "/usuarios": ["admin"],
  "/auditoria": ["admin"],
  "/configuracoes": ["admin"],
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Usuário sem role atribuída
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta ainda não possui permissões atribuídas. 
            Entre em contato com um administrador para liberar seu acesso.
          </p>
          <p className="text-sm text-muted-foreground">
            E-mail: {user.email}
          </p>
        </div>
      </div>
    );
  }

  // Verificar permissões da rota
  const allowedRoles = requiredRoles || routePermissions[location.pathname];
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center p-6 bg-card rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Acesso Negado</h2>
          <p className="text-muted-foreground mb-4">
            Você não possui permissão para acessar esta página.
          </p>
          <p className="text-sm text-muted-foreground">
            Seu perfil: <span className="font-medium capitalize">{role}</span>
          </p>
          <a 
            href="/" 
            className="inline-block mt-4 text-primary hover:underline"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
