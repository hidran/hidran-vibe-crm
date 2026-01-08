import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useOrganizationStats } from "@/hooks/useOrganizationStats";
import { useRevenueData } from "@/hooks/useRevenueData";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Briefcase,
  CheckSquare,
  Users,
  FileText,
  AlertCircle
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { data: isSuperadmin } = useIsSuperadmin();
  
  // Fetch organization statistics
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useOrganizationStats(organization?.id, isSuperadmin || false);

  // Fetch revenue data
  const {
    data: revenueData = [],
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue
  } = useRevenueData(organization?.id, 12, isSuperadmin || false);

  return (
    <DashboardLayout 
      title="Dashboard" 
      description="Welcome back! Here's an overview of your workspace."
      actions={
        <Button className="gap-2" onClick={() => navigate("/projects/new")}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
    >
      {/* Error State for Statistics */}
      {statsError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load statistics: {statsError.message}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchStats()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <DashboardSection sectionName="statistics">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div style={{ animationDelay: '0ms' }}>
            <StatCard
              label="Clients"
              value={stats?.clients_count ?? 0}
              icon={Users}
              href="/clients"
              isLoading={statsLoading}
            />
          </div>
          <div style={{ animationDelay: '100ms' }}>
            <StatCard
              label="Projects"
              value={stats?.projects_count ?? 0}
              icon={Briefcase}
              href="/projects"
              isLoading={statsLoading}
            />
          </div>
          <div style={{ animationDelay: '200ms' }}>
            <StatCard
              label="Tasks"
              value={stats?.tasks_count ?? 0}
              icon={CheckSquare}
              href="/tasks"
              isLoading={statsLoading}
            />
          </div>
          <div style={{ animationDelay: '300ms' }}>
            <StatCard
              label="Invoices"
              value={stats?.invoices_count ?? 0}
              icon={FileText}
              href="/invoices"
              isLoading={statsLoading}
            />
          </div>
        </div>
      </DashboardSection>

      {/* Revenue Chart */}
      <DashboardSection sectionName="revenue chart">
        <div className="mb-8">
          <RevenueChart
            data={revenueData}
            isLoading={revenueLoading}
            error={revenueError}
            onRetry={() => refetchRevenue()}
          />
        </div>
      </DashboardSection>

      {/* Quick Actions */}
      <DashboardSection sectionName="quick actions">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            onClick={() => navigate("/projects")}
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors duration-200">
                <Briefcase className="h-5 w-5 text-primary transition-transform duration-300 hover:scale-110" />
                Projects
              </CardTitle>
              <CardDescription>
                Create and manage your projects with tasks and deadlines.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            onClick={() => navigate("/clients")}
            style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors duration-200">
                <Users className="h-5 w-5 text-primary transition-transform duration-300 hover:scale-110" />
                Clients
              </CardTitle>
              <CardDescription>
                Manage your client relationships and contact information.
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
            onClick={() => navigate("/invoices")}
            style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 transition-colors duration-200">
                <FileText className="h-5 w-5 text-primary transition-transform duration-300 hover:scale-110" />
                Invoices
              </CardTitle>
              <CardDescription>
                Create professional invoices and track payments.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardSection>
    </DashboardLayout>
  );
};

export default Dashboard;
