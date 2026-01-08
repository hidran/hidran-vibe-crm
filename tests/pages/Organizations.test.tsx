import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Organizations from "@/pages/Organizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useOrganizations, useDeleteOrganization } from "@/hooks/useOrganizations";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const mockToast = vi.fn();
const mockRefetch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/hooks/useIsSuperadmin");
vi.mock("@/hooks/useOrganizations");
vi.mock("@/hooks/use-toast");
vi.mock("@/contexts/AuthContext");
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));
vi.mock("@/components/organizations/OrganizationMembersDialog", () => ({
  default: () => <div data-testid="members-dialog" />,
}));
vi.mock("@/components/organizations/OrganizationDialog", () => ({
  default: () => <div data-testid="organization-dialog" />,
}));

const mockedUseIsSuperadmin = vi.mocked(useIsSuperadmin);
const mockedUseOrganizations = vi.mocked(useOrganizations);
const mockedUseDeleteOrganization = vi.mocked(useDeleteOrganization);
const mockedUseToast = vi.mocked(useToast);
const mockedUseAuth = vi.mocked(useAuth);

const buildOrganizations = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `org-${index + 1}`,
    name: `Organization ${index + 1}`,
    legal_name: `Organization ${index + 1} Holdings`,
    industry: index % 2 === 0 ? "SaaS" : "Consulting",
    website: `https://org${index + 1}.example.com`,
    tax_id: `TAX-${index + 1}`,
    created_at: new Date(2024, 0, index + 1).toISOString(),
    updated_at: new Date(2024, 0, index + 1).toISOString(),
    member_count: index % 3,
    plan: null,
    slug: `organization-${index + 1}`,
    logo_url: null,
  }));

describe("Organizations Page", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    mockedUseIsSuperadmin.mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    mockedUseOrganizations.mockReturnValue({
      data: buildOrganizations(22),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockedUseDeleteOrganization.mockReturnValue({
      mutateAsync: mockDelete,
      isPending: false,
    } as any);

    mockedUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" },
      session: { user: { id: "user-1" } },
      loading: false,
      signOut: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Organizations />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it("paginates the organization list and shows metadata", async () => {
    renderComponent();

    expect(screen.getByText("Organization 22")).toBeInTheDocument();
    expect(screen.getByText("Organization 22 Holdings")).toBeInTheDocument();
    expect(screen.getByText("org22.example.com")).toBeInTheDocument();
    expect(screen.getByText("Organization 13")).toBeInTheDocument();
    expect(screen.queryByText("Organization 12")).not.toBeInTheDocument();
    expect(
      screen.getByText("Showing 1 to 10 of 22 organizations"),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(screen.getByText("Organization 12")).toBeInTheDocument();
    expect(screen.getByText("Organization 12 Holdings")).toBeInTheDocument();
    expect(screen.getByText("org12.example.com")).toBeInTheDocument();
    expect(screen.queryByText("Organization 22")).not.toBeInTheDocument();
  });

  it("shows action buttons for every row", () => {
    renderComponent();

    const editButtons = screen.getAllByTitle("Edit organization");
    const deleteButtons = screen.getAllByTitle("Delete organization");

    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toEqual(editButtons.length);
  });
});
