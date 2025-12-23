import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Simulador from "./pages/Simulador";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Cadastros from "./pages/Cadastros";
import Indicadores from "./pages/Indicadores";
import Financeiro from "./pages/Financeiro";
import ExtratoDono from "./pages/ExtratoDono";
import Relatorios from "./pages/Relatorios";
import AuditLogs from "./pages/AuditLogs";
import Permissoes from "./pages/Permissoes";
import Configuracoes from "./pages/Configuracoes";
import OperacoesProprias from "./pages/OperacoesProprias";
import OperacoesTerceiros from "./pages/OperacoesTerceiros";
import OperacoesIntermediacao from "./pages/OperacoesIntermediacao";

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
            <Route path="/operacoes-proprias" element={<ProtectedRoute><OperacoesProprias /></ProtectedRoute>} />
            <Route path="/operacoes-terceiros" element={<ProtectedRoute><OperacoesTerceiros /></ProtectedRoute>} />
            <Route path="/operacoes-intermediacao" element={<ProtectedRoute><OperacoesIntermediacao /></ProtectedRoute>} />
            <Route path="/simulador" element={<ProtectedRoute><Simulador /></ProtectedRoute>} />
            <Route path="/cadastros" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
            <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/extrato-dono" element={<ProtectedRoute><ExtratoDono /></ProtectedRoute>} />
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
