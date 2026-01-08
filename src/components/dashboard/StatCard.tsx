import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  isLoading?: boolean;
}

export const StatCard = ({ label, value, icon: Icon, href, isLoading = false }: StatCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(href);
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
      onClick={handleClick}
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground transition-colors duration-200">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground transition-all duration-300 hover:text-primary hover:scale-110" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
