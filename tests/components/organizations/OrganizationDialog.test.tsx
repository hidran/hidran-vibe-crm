import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrganizationDialog from '@/components/organizations/OrganizationDialog';
import * as useOrganizationsHooks from '@/hooks/useOrganizations';

// Mock the hooks
vi.mock('@/hooks/useOrganizations');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('OrganizationDialog', () => {
  let queryClient: QueryClient;
  const mockMutateAsync = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock the mutation hooks
    vi.spyOn(useOrganizationsHooks, 'useCreateOrganization').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
    } as any);

    vi.spyOn(useOrganizationsHooks, 'useUpdateOrganization').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
    } as any);
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: mockOnOpenChange,
      organization: null,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <OrganizationDialog {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders in create mode with empty form', () => {
    renderDialog();

    expect(screen.getByText('New Organization')).toBeInTheDocument();
    expect(screen.getByText('Add a new organization to the platform.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Organization name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Registered legal entity')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., VAT123456')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., SaaS, Consulting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders in edit mode with pre-populated data', () => {
    const organization = {
      id: '123',
      name: 'Test Organization',
       legal_name: 'Test Organization LLC',
       tax_id: 'VAT-999',
       website: 'https://test.org',
       industry: 'Consulting',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    renderDialog({ organization });

    expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    expect(screen.getByText('Update organization information.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Organization')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('submits form successfully in create mode', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'New Org' });

    renderDialog();

    await user.type(screen.getByPlaceholderText('Organization name'), 'New Organization');
    await user.type(screen.getByPlaceholderText('Registered legal entity'), 'New Org LLC');
    await user.type(screen.getByPlaceholderText('e.g., VAT123456'), 'VAT-123');
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://new-org.com');
    await user.type(screen.getByPlaceholderText('e.g., SaaS, Consulting'), 'SaaS');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Organization',
          legal_name: 'New Org LLC',
          tax_id: 'VAT-123',
          website: 'https://new-org.com',
          industry: 'SaaS',
        }),
      );
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('submits form successfully in edit mode', async () => {
    const user = userEvent.setup();
    const organization = {
      id: '123',
      name: 'Old Name',
      legal_name: 'Old Legal',
      tax_id: 'OLD-TAX',
      website: 'https://old.com',
      industry: 'Retail',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    mockMutateAsync.mockResolvedValueOnce({ ...organization, name: 'Updated Name' });

    renderDialog({ organization });

    const nameInput = screen.getByDisplayValue('Old Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    const legalInput = screen.getByDisplayValue('Old Legal');
    await user.clear(legalInput);
    await user.type(legalInput, 'Updated Legal');

    const taxInput = screen.getByDisplayValue('OLD-TAX');
    await user.clear(taxInput);
    await user.type(taxInput, 'NEW-TAX');

    const websiteInput = screen.getByDisplayValue('https://old.com');
    await user.clear(websiteInput);
    await user.type(websiteInput, 'https://updated.com');

    const industryInput = screen.getByDisplayValue('Retail');
    await user.clear(industryInput);
    await user.type(industryInput, 'Fintech');

    const submitButton = screen.getByRole('button', { name: /update/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          name: 'Updated Name',
          legal_name: 'Updated Legal',
          tax_id: 'NEW-TAX',
          website: 'https://updated.com',
          industry: 'Fintech',
        }),
      );
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('strips optional identity fields when left blank', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Blank Org' });

    renderDialog();

    await user.type(screen.getByPlaceholderText('Organization name'), 'Blank Org');
    await user.type(screen.getByPlaceholderText('Registered legal entity'), ' ');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Blank Org',
          legal_name: undefined,
          tax_id: undefined,
          website: undefined,
          industry: undefined,
        }),
      );
    });
  });

  it('shows loading state during submission', () => {
    vi.spyOn(useOrganizationsHooks, 'useCreateOrganization').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      status: 'pending',
      submittedAt: Date.now(),
    } as any);

    renderDialog();

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /create/i }).querySelector('svg')).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
