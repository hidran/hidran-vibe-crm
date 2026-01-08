import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Dashboard';

// Mock hooks
const mockUseAuth = vi.fn();
const mockUseOrganization = vi.fn();
const mockUseOrganizationStats = vi.fn();
const mockUseRevenueData = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock('@/hooks/useOrganizationStats', () => ({
  useOrganizationStats: () => mockUseOrganizationStats(),
}));

vi.mock('@/hooks/useRevenueData', () => ({
  useRevenueData: () => mockUseRevenueData(),
}));

describe('Dashboard Error Scenarios', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-1', name: 'Test Org' },
    });
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Statistics Fetch Failures', () => {
    it('displays error message when statistics fetch fails', async () => {
      const mockRefetch = vi.fn();
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Database connection failed'),
        refetch: mockRefetch,
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load statistics/i)).toBeInTheDocument();
        expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
      });
    });

    it('provides retry button for statistics fetch failure', async () => {
      const mockRefetch = vi.fn();
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('calls refetch when retry button is clicked for statistics', async () => {
      const mockRefetch = vi.fn();
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Timeout error'),
        refetch: mockRefetch,
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        fireEvent.click(retryButton);
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('displays zero values when statistics error occurs', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Query failed'),
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        // Stat cards should show 0 when error occurs
        const statCards = screen.getAllByText('0');
        expect(statCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Revenue Fetch Failures', () => {
    it('displays error message when revenue fetch fails', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: {
          organization_id: 'org-1',
          clients_count: 5,
          projects_count: 10,
          tasks_count: 25,
          invoices_count: 8,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to aggregate revenue data'),
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load revenue data/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to aggregate revenue data/i)).toBeInTheDocument();
      });
    });

    it('provides retry functionality for revenue fetch failure', async () => {
      const mockRefetch = vi.fn();
      mockUseOrganizationStats.mockReturnValue({
        data: {
          organization_id: 'org-1',
          clients_count: 5,
          projects_count: 10,
          tasks_count: 25,
          invoices_count: 8,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('RLS policy violation'),
        refetch: mockRefetch,
      });

      renderDashboard();

      await waitFor(() => {
        // Check that retry button exists in the document
        const retryButtons = screen.getAllByRole('button', { name: /retry/i });
        expect(retryButtons.length).toBeGreaterThan(0);
      });
    });

    it('calls refetch when retry button is clicked for revenue', async () => {
      const mockRefetch = vi.fn();
      mockUseOrganizationStats.mockReturnValue({
        data: {
          organization_id: 'org-1',
          clients_count: 5,
          projects_count: 10,
          tasks_count: 25,
          invoices_count: 8,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Query timeout'),
        refetch: mockRefetch,
      });

      renderDashboard();

      await waitFor(async () => {
        const retryButtons = screen.getAllByRole('button', { name: /retry/i });
        // Click the last retry button (revenue chart)
        if (retryButtons.length > 0) {
          fireEvent.click(retryButtons[retryButtons.length - 1]);
        }
      });

      // Wait a bit for the click to be processed
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Combined Error Scenarios', () => {
    it('handles both statistics and revenue fetch failures simultaneously', async () => {
      const mockStatsRefetch = vi.fn();
      const mockRevenueRefetch = vi.fn();

      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Statistics service unavailable'),
        refetch: mockStatsRefetch,
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Revenue service unavailable'),
        refetch: mockRevenueRefetch,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load statistics/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load revenue data/i)).toBeInTheDocument();
      });

      // Both retry buttons should be present
      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      expect(retryButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('recovers gracefully when error is resolved on retry', async () => {
      const mockRefetch = vi.fn();
      
      // First render with error
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Temporary error'),
        refetch: mockRefetch,
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { rerender } = renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load statistics/i)).toBeInTheDocument();
      });

      // Simulate successful retry
      mockUseOrganizationStats.mockReturnValue({
        data: {
          organization_id: 'org-1',
          clients_count: 5,
          projects_count: 10,
          tasks_count: 25,
          invoices_count: 8,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Failed to load statistics/i)).not.toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  describe('Network and Timeout Errors', () => {
    it('handles network timeout errors gracefully', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Request timeout after 30s'),
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Request timeout after 30s/i)).toBeInTheDocument();
      });
    });

    it('handles network connection errors', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network connection lost'),
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Network connection lost/i)).toBeInTheDocument();
      });
    });
  });

  describe('Permission and Authorization Errors', () => {
    it('handles RLS policy violations', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Row level security policy violation'),
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Row level security policy violation/i)).toBeInTheDocument();
      });
    });

    it('handles unauthorized access errors', async () => {
      mockUseOrganizationStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Unauthorized: Invalid JWT token'),
        refetch: vi.fn(),
      });

      mockUseRevenueData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Unauthorized: Invalid JWT token/i)).toBeInTheDocument();
      });
    });
  });
});
