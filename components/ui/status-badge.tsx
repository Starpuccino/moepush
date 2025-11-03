import { cn } from "@/lib/utils"
import { EndpointStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/endpoints"

interface StatusBadgeProps {
  status: EndpointStatus
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? STATUS_LABELS[status]
  const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset"
  
  return (
    <span className={cn(baseClasses, STATUS_COLORS[status], className)}>
      {displayLabel}
    </span>
  )
}
