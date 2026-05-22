import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
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
        "flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-border/80 bg-muted/10 animate-in fade-in duration-200",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-3 border border-border/50 text-muted-foreground/80">
          <Icon className="h-4.5 w-4.5" />
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
