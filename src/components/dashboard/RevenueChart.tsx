import { MonthlyRevenue } from "@/hooks/useRevenueData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueChartProps {
  data: MonthlyRevenue[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

interface RevenueChartData {
  month: string; // Format: "Jan 2024"
  revenue: number;
}

// Format currency with exactly two decimal places
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 animate-in fade-in duration-200">
        <p className="text-sm font-medium text-foreground">{data.month}</p>
        <p className="text-sm text-muted-foreground">
          Revenue: <span className="font-semibold text-primary">{formatCurrency(data.revenue)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const RevenueChart = ({ data, isLoading = false, error, onRetry }: RevenueChartProps) => {
  // Transform data for Recharts format
  const chartData: RevenueChartData[] = data.map((item) => {
    // Convert "YYYY-MM" to "Jan 2024" format
    const [year, month] = item.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const monthName = date.toLocaleDateString("en-US", { month: "short" });
    
    return {
      month: `${monthName} ${year}`,
      revenue: item.revenue,
    };
  }).reverse(); // Reverse to show oldest to newest (left to right)

  return (
    <Card className="transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationFillMode: 'backwards' }}>
      <CardHeader>
        <CardTitle className="transition-colors duration-200">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] animate-in fade-in duration-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-destructive mb-2 animate-in fade-in duration-300">Failed to load revenue data</p>
            <p className="text-sm text-muted-foreground mb-4 animate-in fade-in duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
              >
                Retry
              </button>
            )}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-muted-foreground text-lg mb-2 animate-in fade-in duration-300">No revenue data available yet</p>
            <p className="text-sm text-muted-foreground animate-in fade-in duration-300" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
              Create and mark invoices as paid to see your revenue trends here
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-50" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6, className: "transition-all duration-200" }}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
