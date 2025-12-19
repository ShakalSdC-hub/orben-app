import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FileInput,
  FileOutput,
  Warehouse,
  DollarSign,
  Calculator,
  FileText,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cog,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import orbenLogo from "@/assets/orben-logo.jpeg";

const menuItems = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: TrendingUp, label: "Indicadores LME", path: "/indicadores" },
    ],
  },
  {
    title: "Operacional",
    items: [
      { icon: FileInput, label: "Entrada", path: "/entrada" },
      { icon: Cog, label: "Beneficiamento", path: "/beneficiamento" },
      { icon: FileOutput, label: "Saída", path: "/saida" },
      { icon: Warehouse, label: "Estoque", path: "/estoque" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
      { icon: Calculator, label: "Simulador LME", path: "/simulador" },
      { icon: FileText, label: "Relatórios", path: "/relatorios" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { icon: Package, label: "Cadastros", path: "/cadastros" },
      { icon: Users, label: "Usuários", path: "/usuarios" },
      { icon: ShieldCheck, label: "Auditoria", path: "/auditoria" },
      { icon: Settings, label: "Configurações", path: "/configuracoes" },
    ],
  },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img 
              src={orbenLogo} 
              alt="ORBEN Logo" 
              className="h-10 w-10 rounded-lg object-cover shadow-copper"
            />
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">ORBEN</h1>
              <p className="text-[10px] text-sidebar-foreground/60">IBRAC Industrial</p>
            </div>
          </div>
        ) : (
          <img 
            src={orbenLogo} 
            alt="ORBEN Logo" 
            className="h-9 w-9 rounded-lg object-cover shadow-copper"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuItems.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h2 className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                {section.title}
              </h2>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-copper"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "drop-shadow-sm")} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Branding */}
      <div className="border-t border-sidebar-border p-4">
        {!collapsed ? (
          <div className="text-center">
            <p className="text-[10px] text-sidebar-foreground/40">
              by <span className="font-medium text-sidebar-foreground/60">Santos Soluções Digitais</span>
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-sidebar-foreground/30" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 bg-card/90 backdrop-blur shadow-md lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0 border-sidebar-border">
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}

export function useSidebarState() {
  const isMobile = useIsMobile();
  return { isMobile };
}
