import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon | React.ComponentType<any> | string | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-primary/10 bg-primary/5 animate-in fade-in duration-200",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center mb-3 border border-primary/10 text-primary">
          {typeof Icon === "string" ? (
            <span className="material-symbols-outlined text-[18px]">{Icon}</span>
          ) : typeof Icon === "function" ? (
            React.createElement(Icon as any, { className: "h-4.5 w-4.5" })
          ) : (
            Icon as any
          )}
        </div>
      )}
      <h3 className="text-xs font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  )
}


