import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrganizationMembersDialog from '@/components/organizations/OrganizationMembersDialog';
import * as useOrganizationsHooks from '@/hooks/useOrganizations';

// Mock the hooks
vi.mock('@/hooks/useOrganizations');

describe('OrganizationMembersDialog', () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();
  const mockOrganizationId = 'test-org-123';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: mockOnOpenChange,
      organizationId: mockOrganizationId,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <OrganizationMembersDialog {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('displays member list', () => {
    const mockMembers = [
      {
        id: 'member-1',
        organization_id: mockOrganizationId,
        user_id: 'user-1',
        role: 'owner',
        created_at: '2024-01-15T10:00:00Z',
        profile: {
          email: 'owner@example.com',
          full_name: 'John Owner',
        },
      },
      {
        id: 'member-2',
        organization_id: mockOrganizationId,
        user_id: 'user-2',
        role: 'admin',
        created_at: '2024-02-20T14:30:00Z',
        profile: {
          email: 'admin@example.com',
          full_name: 'Jane Admin',
        },
      },
      {
        id: 'member-3',
        organization_id: mockOrganizationId,
        user_id: 'user-3',
        role: 'member',
        created_at: '2024-03-10T09:15:00Z',
        profile: {
          email: 'member@example.com',
          full_name: null,
        },
      },
    ];

    vi.spyOn(useOrganizationsHooks, 'useOrganizationMembers').mockReturnValue({
      data: mockMembers,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      status: 'success',
    } as any);

    renderDialog();

    // Check dialog title and description
    expect(screen.getByText('Organization Members')).toBeInTheDocument();
    expect(screen.getByText('View all members of this organization.')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Join Date')).toBeInTheDocument();

    // Check member data is displayed
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('John Owner')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Admin')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Feb 20, 2024')).toBeInTheDocument();

    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('Mar 10, 2024')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.spyOn(useOrganizationsHooks, 'useOrganizationMembers').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false,
      refetch: vi.fn(),
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      status: 'pending',
    } as any);

    renderDialog();

    // Check that loading skeletons are displayed (Skeleton components have specific styling)
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    // The component should show skeleton rows when loading
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header + skeleton rows
  });

  it('shows empty state', () => {
    vi.spyOn(useOrganizationsHooks, 'useOrganizationMembers').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      status: 'success',
    } as any);

    renderDialog();

    // Check that empty state message is displayed
    expect(screen.getByText('No members found')).toBeInTheDocument();
  });
});
