import { AlertCircle, CheckCircle2, Sparkles, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type RoomStatus } from "@/lib/validators";

type RoomStatusBadgeProps = {
  status: RoomStatus | string;
  className?: string;
};

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; variant: "destructive" | "warning" | "success" | "secondary"; icon?: React.ReactNode }
> = {
  dirty: {
    label: "Dirty",
    variant: "destructive",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  cleaning: {
    label: "Cleaning",
    variant: "warning",
    icon: <Sparkles className="h-3 w-3" />,
  },
  available: {
    label: "Available",
    variant: "success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  occupied: {
    label: "Occupied",
    variant: "secondary",
  },
  maintenance: {
    label: "Maintenance",
    variant: "secondary",
  },
};

export function RoomStatusBadge({ status, className }: RoomStatusBadgeProps) {
  const config = (status in STATUS_CONFIG ? STATUS_CONFIG[status as RoomStatus] : null) || {
    label: status || "Unknown",
    variant: "secondary" as const,
    icon: <HelpCircle className="h-3 w-3" />,
  };

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${className ?? ""}`.trim()}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}


