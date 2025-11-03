import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "active" | "inactive"
  label?: string
  className?: string
}

const STATUS_STYLES = {
  active: "bg-green-50 text-green-700 ring-green-600/20",
  inactive: "bg-red-50 text-red-700 ring-red-600/20",
}

const DEFAULT_LABELS = {
  active: "正常",
  inactive: "禁用",
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? DEFAULT_LABELS[status]
  const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset"
  
  return (
    <span className={cn(baseClasses, STATUS_STYLES[status], className)}>
      {displayLabel}
    </span>
  )
}
