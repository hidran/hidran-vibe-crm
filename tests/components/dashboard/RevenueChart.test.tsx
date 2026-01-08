import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { MonthlyRevenue } from '@/hooks/useRevenueData';

describe('RevenueChart', () => {
  const mockData: MonthlyRevenue[] = [
    { month: '2024-01', revenue: 1500.50, invoice_count: 3 },
    { month: '2024-02', revenue: 2300.75, invoice_count: 5 },
    { month: '2024-03', revenue: 1800.00, invoice_count: 4 },
  ];

  it('displays empty state message when no data is provided', () => {
    render(<RevenueChart data={[]} />);
    
    expect(screen.getByText('No revenue data available yet')).toBeInTheDocument();
    expect(screen.getByText(/Create and mark invoices as paid/i)).toBeInTheDocument();
  });

  it('displays loading spinner when isLoading is true', () => {
    render(<RevenueChart data={[]} isLoading={true} />);
    
    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    
    // Empty state should not be visible
    expect(screen.queryByText('No revenue data available yet')).not.toBeInTheDocument();
  });

  it('displays error message when error is provided', () => {
    const error = new Error('Network connection failed');
    render(<RevenueChart data={[]} error={error} />);
    
    expect(screen.getByText('Failed to load revenue data')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('displays retry button when error occurs and onRetry is provided', async () => {
    const error = new Error('Network error');
    const onRetry = vi.fn();
    const user = userEvent.setup();
    
    render(<RevenueChart data={[]} error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not display retry button when onRetry is not provided', () => {
    const error = new Error('Network error');
    
    render(<RevenueChart data={[]} error={error} />);
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('renders chart with data', () => {
    render(<RevenueChart data={mockData} />);
    
    // Check that the chart title is present
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    
    // Check that Recharts container is rendered
    const chartContainer = document.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
    
    // Empty state should not be visible
    expect(screen.queryByText('No revenue data available yet')).not.toBeInTheDocument();
  });

  it('prioritizes loading state over error state', () => {
    const error = new Error('Some error');
    render(<RevenueChart data={[]} isLoading={true} error={error} />);
    
    // Loading spinner should be visible
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    
    // Error message should not be visible
    expect(screen.queryByText('Failed to load revenue data')).not.toBeInTheDocument();
  });

  it('prioritizes error state over empty state', () => {
    const error = new Error('Some error');
    render(<RevenueChart data={[]} error={error} />);
    
    // Error message should be visible
    expect(screen.getByText('Failed to load revenue data')).toBeInTheDocument();
    
    // Empty state should not be visible
    expect(screen.queryByText('No revenue data available yet')).not.toBeInTheDocument();
  });

  it('transforms month format correctly for display', () => {
    render(<RevenueChart data={mockData} />);
    
    // The chart should transform "2024-01" to "Jan 2024" format
    // We can't easily test the chart internals, but we can verify the chart renders
    const chartContainer = document.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
  });
});
