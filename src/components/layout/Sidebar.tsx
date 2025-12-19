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
  Factory,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: TrendingUp, label: "Indicadores", path: "/indicadores" },
    ],
  },
  {
    title: "Operacional",
    items: [
      { icon: FileInput, label: "ROM Entrada", path: "/rom-entrada" },
      { icon: FileOutput, label: "ROM Saída", path: "/rom-saida" },
      { icon: Package, label: "Sub-Lotes", path: "/sub-lotes" },
      { icon: Warehouse, label: "Estoque", path: "/estoque" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { icon: DollarSign, label: "Posição Financeira", path: "/financeiro" },
      { icon: Calculator, label: "Simulador", path: "/simulador" },
      { icon: FileText, label: "Relatórios", path: "/relatorios" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { icon: Factory, label: "Parceiros", path: "/parceiros" },
      { icon: Users, label: "Usuários", path: "/usuarios" },
      { icon: Settings, label: "Configurações", path: "/configuracoes" },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-copper shadow-copper">
              <Factory className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">ORBEN</h1>
              <p className="text-[10px] text-sidebar-foreground/60">IBRAC Industrial</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-copper shadow-copper">
            <Factory className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

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

      {/* Navigation */}
      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
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
    </aside>
  );
}
