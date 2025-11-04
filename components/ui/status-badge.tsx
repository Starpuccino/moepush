import { cn } from "@/lib/utils"
import { EndpointStatus, STATUS_LABELS, ENDPOINT_STATUS } from "@/lib/constants/endpoints"

interface StatusBadgeProps {
  status: EndpointStatus
  label?: string
  className?: string
}

const STATUS_STYLES: Record<EndpointStatus, string> = {
  [ENDPOINT_STATUS.ACTIVE]: "bg-green-50 text-green-700 ring-green-600/20",
  [ENDPOINT_STATUS.INACTIVE]: "bg-red-50 text-red-700 ring-red-600/20",
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? STATUS_LABELS[status]
  const baseClasses = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset"
  const statusClasses = STATUS_STYLES[status]
  
  return (
    <span className={cn(baseClasses, statusClasses, className)}>
      {displayLabel}
    </span>
  )
}
