import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Auth from "@/pages/Auth";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
vi.mock("@/contexts/AuthContext");
vi.mock("@/hooks/use-toast");

const { 
  mockSignInWithPassword, 
  mockSignUp, 
  mockGetSession, 
  mockOnAuthStateChange 
} = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseToast = vi.mocked(useToast);

describe("Auth Page", () => {
  let queryClient: QueryClient;
  const mockToast = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({ data: { session: null, error: null } });
    mockOnAuthStateChange.mockImplementation((callback) => {
        // Immediately call the callback to simulate initial auth state change
        // with no session, mimicking the behavior of a fresh page load
        callback("INITIAL_SESSION", { session: null, user: null });
        return {
            data: {
                subscription: {
                    unsubscribe: vi.fn(),
                },
            },
        };
    });

    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    // Default mock for useAuth, assuming unauthenticated state
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderAuthComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("renders the login form by default", () => {
    renderAuthComponent();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it("allows switching to the signup form", async () => {
    renderAuthComponent();
    const signupTab = screen.getByRole("tab", { name: /Sign Up/i });
    await userEvent.click(signupTab);
    
    // Both forms have Email/Password fields, but we should see "Create Account" button
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("handles successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" }, session: {} },
      error: null,
    });
    
    renderAuthComponent();
    await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("handles failed login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid credentials" },
    });

    renderAuthComponent();
    await userEvent.type(screen.getByLabelText(/Email/i), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "wrongpassword");
    await userEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid credentials",
      });
    });
  });

  it("handles successful signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "new-user-123", email: "new@example.com" }, session: null },
      error: null,
    });

    renderAuthComponent();
    await userEvent.click(screen.getByRole("tab", { name: /Sign Up/i }));
    
    await userEvent.type(screen.getByLabelText(/Email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "newpassword123");
    await userEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "newpassword123",
        options: {
          emailRedirectTo: expect.stringContaining("/dashboard"),
        },
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: "Account created!",
        description: "You can now sign in with your credentials.",
      });
    });
  });

  it("displays validation errors", async () => {
    renderAuthComponent();
    await userEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});