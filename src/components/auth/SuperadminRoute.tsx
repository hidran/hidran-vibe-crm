import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { Loader2 } from "lucide-react";

interface SuperadminRouteProps {
  children: ReactNode;
}

const SuperadminRoute = ({ children }: SuperadminRouteProps) => {
  const { data: isSuperadmin, isLoading } = useIsSuperadmin();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SuperadminRoute;
