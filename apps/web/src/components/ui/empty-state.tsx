import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FadeUp } from "@/components/ui/motion"

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
    <FadeUp
      className={cn(
        "flex flex-col items-center justify-center text-center p-10 rounded-lg border border-dashed border-border bg-muted/30",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center mb-4 border border-border text-muted-foreground">
          {typeof Icon === "string" ? (
            <span className="material-symbols-outlined text-[20px]">{Icon}</span>
          ) : typeof Icon === "function" ? (
            React.createElement(Icon as any, { className: "h-5 w-5" })
          ) : (
            Icon as any
          )}
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </FadeUp>
  )
}
