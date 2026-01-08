import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

interface StatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const variants: Record<InvoiceStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
    sent: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
    paid: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
  };

  return (
    <Badge variant="outline" className={cn("capitalize", variants[status], className)}>
      {status}
    </Badge>
  );
};
