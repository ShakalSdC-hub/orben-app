import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Entrada from "./pages/Entrada";
import Estoque from "./pages/Estoque";
import Simulador from "./pages/Simulador";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Cadastros from "./pages/Cadastros";
import Indicadores from "./pages/Indicadores";
import Beneficiamento from "./pages/Beneficiamento";
import Saida from "./pages/Saida";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import AuditLogs from "./pages/AuditLogs";
import Permissoes from "./pages/Permissoes";
import Configuracoes from "./pages/Configuracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/entrada" element={<ProtectedRoute><Entrada /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
            <Route path="/simulador" element={<ProtectedRoute><Simulador /></ProtectedRoute>} />
            <Route path="/cadastros" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
            <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
            <Route path="/beneficiamento" element={<ProtectedRoute><Beneficiamento /></ProtectedRoute>} />
            <Route path="/saida" element={<ProtectedRoute><Saida /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/auditoria" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Permissoes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
