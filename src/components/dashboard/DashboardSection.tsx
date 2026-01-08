import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DashboardSectionProps {
  children: ReactNode;
  sectionName: string;
}

export const DashboardSection = ({ children, sectionName }: DashboardSectionProps) => {
  const handleError = (error: Error, errorInfo: any) => {
    // Comprehensive error logging for dashboard sections
    console.group(`🚨 Error in dashboard section: ${sectionName}`);
    console.error('Section:', sectionName);
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (errorInfo?.componentStack) {
      console.error('Component stack:', errorInfo.componentStack);
    }
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
  };

  const fallback = (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>Failed to load {sectionName}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
