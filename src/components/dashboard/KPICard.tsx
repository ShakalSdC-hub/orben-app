import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "copper" | "success" | "warning";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  variant = "default",
}: KPICardProps) {
  const variants = {
    default: "bg-card",
    copper: "bg-gradient-copper text-primary-foreground",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    copper: "bg-primary-foreground/20 text-primary-foreground",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 shadow-elevated transition-all hover:shadow-lg animate-slide-up",
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "copper" ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p
              className={cn(
                "text-xs",
                variant === "copper" ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", iconVariants[variant])}>{icon}</div>
      </div>

      {trend && trendValue && (
        <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", variant === "copper" ? "text-primary-foreground/90" : trendColors[trend])}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trendValue}</span>
          <span className={variant === "copper" ? "text-primary-foreground/70" : "text-muted-foreground"}>vs mês anterior</span>
        </div>
      )}

      {/* Decorative element */}
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10",
          variant === "copper" ? "bg-primary-foreground" : "bg-primary"
        )}
      />
    </div>
  );
}
