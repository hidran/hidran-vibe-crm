import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequireOrganization from "@/components/organizations/RequireOrganization";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: vi.fn(),
}));
vi.mock("@/hooks/useIsSuperadmin", () => ({
  useIsSuperadmin: vi.fn(),
}));
vi.mock("@/hooks/use-toast");

const mockUseOrganization = vi.mocked(useOrganization);
const mockUseIsSuperadmin = vi.mocked(useIsSuperadmin);
const mockUseToast = vi.mocked(useToast);

describe("RequireOrganization", () => {
  let queryClient: QueryClient;
  let mockCreateOrganizationMutateAsync: vi.Mock;
  let mockToastFn: vi.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    mockCreateOrganizationMutateAsync = vi.fn();
    mockToastFn = vi.fn();

    mockUseToast.mockReturnValue({ toast: mockToastFn });

    // Default mock values for hooks - assuming user has an org and is not superadmin
    mockUseOrganization.mockReturnValue({
      organization: { id: "default-org-id", name: "Default Org" },
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: false,
      isLoading: false,
    });
  });

  const renderComponent = (children?: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RequireOrganization>
            {children || <div>Protected Content</div>}
          </RequireOrganization>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders children when an organization exists", () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: "org-1", name: "Test Org" },
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    renderComponent();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when the user is a superadmin", () => {
    mockUseOrganization.mockReturnValue({
      organization: null,
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: true,
      isLoading: false,
    });
    renderComponent();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("displays loading spinner when organization data is loading", () => {
    mockUseOrganization.mockReturnValue({
      organization: undefined,
      isLoading: true,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: undefined,
      isLoading: true, // isSuperadmin loading also implies overall loading
    });
    renderComponent();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument(); 
  });

  it("displays 'Create Your Organization' card when no organization and not superadmin", () => {
    mockUseOrganization.mockReturnValue({
      organization: null,
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: false,
      isLoading: false,
    });
    renderComponent();
    expect(screen.getByText("Create Your Organization")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Organization/i })).toBeInTheDocument();
  });

  it("calls createOrganization when 'Create Organization' button is clicked and renders children on success", async () => {
    const newOrg = { id: "new-org-id", name: "New Org" };
    mockCreateOrganizationMutateAsync.mockResolvedValue(newOrg); // Mock success

    mockUseOrganization.mockReturnValue({
      organization: null, // Initially no organization
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: false,
      isLoading: false,
    });

    const { rerender } = renderComponent(); // Render component initially

    const createButton = screen.getByRole("button", { name: /Create Organization/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateOrganizationMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockCreateOrganizationMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        name: "My Organization",
      }));
    });

    expect(mockToastFn).toHaveBeenCalledWith({
      title: "Organization created successfully",
    });
    
    // Simulate useOrganization returning the new organization after successful mutation
    mockUseOrganization.mockReturnValue({
      organization: newOrg,
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    // Re-render the component to reflect the updated mock return value
    // This simulates React Query re-fetching after invalidation and returning the new data
    rerender(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RequireOrganization>
            <div>Protected Content</div>
          </RequireOrganization>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("displays error toast if organization creation fails and remains on card", async () => {
    mockCreateOrganizationMutateAsync.mockRejectedValue(new Error("Failed to create")); // Mock failure

    mockUseOrganization.mockReturnValue({
      organization: null,
      isLoading: false,
      createOrganization: { mutateAsync: mockCreateOrganizationMutateAsync },
    });
    mockUseIsSuperadmin.mockReturnValue({
      data: false,
      isLoading: false,
    });
    
    renderComponent();

    const createButton = screen.getByRole("button", { name: /Create Organization/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateOrganizationMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockToastFn).toHaveBeenCalledWith({
      variant: "destructive",
      title: "Error",
      description: "Failed to create",
    });
    // It should still display the create organization card after failure
    expect(screen.getByText("Create Your Organization")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});