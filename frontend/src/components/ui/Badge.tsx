import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

type BadgeVariant = "present" | "absent" | "late" | "excused" | "default";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant | AttendanceStatus;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
  late: "bg-yellow-100 text-yellow-800",
  excused: "bg-blue-100 text-blue-800",
  default: "bg-gray-100 text-gray-800",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant] || variantStyles.default,
        className
      )}
    >
      {children}
    </span>
  );
}
