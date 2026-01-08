import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Users from "@/pages/Users";
import { useUsers } from "@/hooks/useUsers";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock hooks
vi.mock("@/hooks/useUsers");
vi.mock("@/hooks/useOrganization");
vi.mock("@/hooks/useOrganizations");
vi.mock("@/hooks/useIsSuperadmin");
vi.mock("@/hooks/use-toast");
vi.mock("@/contexts/AuthContext");
vi.mock("@/hooks/use-mobile", () => ({
    useIsMobile: vi.fn(),
}));
vi.mock("@/contexts/ThemeContext", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: vi.fn(),
    }),
}));

// Mock Supabase
const { mockDelete, mockEq } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      delete: mockDelete,
    }),
  },
}));

mockDelete.mockReturnValue({ eq: mockEq });

const mockUseUsers = vi.mocked(useUsers);
const mockUseOrganization = vi.mocked(useOrganization);
const mockUseOrganizations = vi.mocked(useOrganizations);
const mockUseIsSuperadmin = vi.mocked(useIsSuperadmin);
const mockUseToast = vi.mocked(useToast);
const mockUseAuth = vi.mocked(useAuth);
const mockUseIsMobile = vi.mocked(useIsMobile);

describe("Users Page", () => {
  let queryClient: QueryClient;
  const mockToast = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      session: { user: { id: "user-1" } },
      loading: false,
      signOut: vi.fn(),
    } as any);

    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    mockUseOrganization.mockReturnValue({
      organization: { id: "org-1", name: "Test Org", slug: "test-org" } as any,
      isLoading: false,
      userOrganizations: [],
      createOrganization: vi.fn(),
    });

    mockUseOrganizations.mockReturnValue({
        data: [{ id: "org-1", name: "Test Org" }, { id: "org-2", name: "Other Org" }],
        isLoading: false,
    } as any);

    mockUseIsSuperadmin.mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    mockUseIsMobile.mockReturnValue(false); // Default to desktop view

    // Mock generic users
    mockUseUsers.mockReturnValue({
        data: Array.from({ length: 25 }, (_, i) => ({
            id: `member-${i}`,
            user_id: `user-${i}`,
            full_name: `User ${i}`,
            email: `user${i}@example.com`,
            role: "member",
            created_at: new Date().toISOString(),
            organization_id: "org-1",
            organization_name: "Test Org",
            first_name: "User",
            last_name: `${i}`,
        })),
        isLoading: false,
    } as any);

    mockEq.mockResolvedValue({ error: null });

    // Mock confirm
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Users />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("renders the users list with pagination", async () => {
    renderComponent();
    
    // Check first page users
    expect(screen.getByText("User 0")).toBeInTheDocument();
    expect(screen.getByText("User 9")).toBeInTheDocument();
    
    // User 10 should be on next page
    expect(screen.queryByText("User 10")).not.toBeInTheDocument();

    // Check pagination controls
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeInTheDocument();
  });

  it("navigates to the next page", async () => {
    renderComponent();
    const user = userEvent.setup();
    
    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    
    expect(screen.getByText("User 10")).toBeInTheDocument();
    expect(screen.queryByText("User 0")).not.toBeInTheDocument();
  });

  it("filters users by search", async () => {
    renderComponent();
    const user = userEvent.setup();
    
    const searchInput = screen.getByPlaceholderText("Search users...");
    await user.type(searchInput, "User 5");
    
    // Filter logic is inside UsersDataTable using React Table
    // But in the test setup, we return a static list of 25 users.
    // React Table inside UsersDataTable *will* filter them if we set up the filter correctly.
    // However, the test passes because `User 5` is in the list.
    // To properly test filter, we should assert that others are gone.
    
    expect(screen.getByText("User 5")).toBeInTheDocument();
    expect(screen.queryByText("User 0")).not.toBeInTheDocument();
  });

  it("handles user deletion (desktop view)", async () => {
    renderComponent();
    const user = userEvent.setup();
    
    // Find the delete button for the first row
    // It has title "Remove user"
    const removeButtons = screen.getAllByTitle("Remove user");
    await user.click(removeButtons[0]);
    
    // Check for dialog
    expect(screen.getByText("Remove User")).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    
    // Click confirm in dialog
    const confirmButton = screen.getByRole("button", { name: "Remove" });
    await user.click(confirmButton);
    
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "member-0");
    
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: "User removed successfully" });
    });
  });

  it("allows superadmin to filter organizations", async () => {
    mockUseIsSuperadmin.mockReturnValue({ data: true, isLoading: false } as any);
    renderComponent();
    
    // Select should be visible with "All Organizations" default placeholder
    // Shadcn Select trigger has the text
    expect(screen.getByText("All Organizations")).toBeInTheDocument();
    
    // Initial call
    // In Users.tsx: queryOrgId is (orgFilter || undefined) for superadmin
    // Default orgFilter is "" -> undefined.
    // So expect useUsers called with undefined
    expect(mockUseUsers).toHaveBeenCalledWith(undefined);
  });

  it("renders mobile card view and handles deletion on mobile", async () => {
    mockUseIsMobile.mockReturnValue(true); // Force mobile view
    renderComponent();

    // Verify MobileDataList is rendered and Table is not
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("User 0")).toBeInTheDocument(); // Check card content
    expect(screen.getByText("user0@example.com")).toBeInTheDocument();

    // Check delete button on card
    const deleteButtons = screen.getAllByRole("button", { name: "Remove" });
    await userEvent.click(deleteButtons[0]);

    // Check for dialog
    expect(screen.getByText("Remove User")).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();

    // Click confirm in dialog
    const confirmButton = screen.getByRole("button", { name: "Remove" });
    await userEvent.click(confirmButton);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "member-0");
    
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: "User removed successfully" });
    });
  });
});