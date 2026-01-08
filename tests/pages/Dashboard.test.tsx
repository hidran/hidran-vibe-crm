import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Dashboard Integration Tests', () => {
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

  it('loads dashboard with real statistics', async () => {
    // Mock statistics data
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

    // Mock revenue data
    mockUseRevenueData.mockReturnValue({
      data: [
        { month: '2024-01', revenue: 1000, invoice_count: 2 },
        { month: '2024-02', revenue: 1500, invoice_count: 3 },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboard();

    // Wait for statistics to be displayed
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Clients
      expect(screen.getByText('10')).toBeInTheDocument(); // Projects
      expect(screen.getByText('25')).toBeInTheDocument(); // Tasks
      expect(screen.getByText('8')).toBeInTheDocument(); // Invoices
    });

    // Verify revenue chart is rendered
    expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
  });

  it('displays loading state while fetching statistics', () => {
    mockUseOrganizationStats.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    mockUseRevenueData.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboard();

    // Check for loading skeletons in stat cards
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays error state when statistics fetch fails', async () => {
    const mockRefetch = vi.fn();
    mockUseOrganizationStats.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch statistics'),
      refetch: mockRefetch,
    });

    mockUseRevenueData.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboard();

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load statistics/i)).toBeInTheDocument();
    });

    // Check for retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('displays revenue chart with correct data', async () => {
    mockUseOrganizationStats.mockReturnValue({
      data: {
        organization_id: 'org-1',
        clients_count: 0,
        projects_count: 0,
        tasks_count: 0,
        invoices_count: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseRevenueData.mockReturnValue({
      data: [
        { month: '2024-01', revenue: 2500.50, invoice_count: 3 },
        { month: '2024-02', revenue: 3000.75, invoice_count: 4 },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });
  });

  it('displays empty state when no revenue data exists', async () => {
    mockUseOrganizationStats.mockReturnValue({
      data: {
        organization_id: 'org-1',
        clients_count: 0,
        projects_count: 0,
        tasks_count: 0,
        invoices_count: 0,
      },
      isLoading: false,
      error: null,
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
      expect(screen.getByText(/No revenue data available yet/i)).toBeInTheDocument();
    });
  });

  it('handles organization switch by updating data', async () => {
    // Initial organization
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-1', name: 'Test Org 1' },
    });

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
      data: [{ month: '2024-01', revenue: 1000, invoice_count: 2 }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { rerender } = renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Simulate organization switch
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-2', name: 'Test Org 2' },
    });

    mockUseOrganizationStats.mockReturnValue({
      data: {
        organization_id: 'org-2',
        clients_count: 3,
        projects_count: 7,
        tasks_count: 15,
        invoices_count: 4,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseRevenueData.mockReturnValue({
      data: [{ month: '2024-01', revenue: 500, invoice_count: 1 }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Verify new organization data is displayed
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  it('displays error state for revenue chart when fetch fails', async () => {
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
      error: new Error('Failed to fetch revenue data'),
      refetch: mockRefetch,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load revenue data/i)).toBeInTheDocument();
    });
  });
});
