import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
vi.mock("@/contexts/AuthContext");
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("useIsSuperadmin", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("returns undefined when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useIsSuperadmin(), { wrapper });

    // When user is null, query is disabled and returns undefined
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns true for superadmin user", async () => {
    const mockUser = { id: "user-123" };
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: true,
      error: null,
    });

    const { result } = renderHook(() => useIsSuperadmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("is_superadmin", { _user_id: "user-123" });
  });

  it("returns false for regular user", async () => {
    const mockUser = { id: "user-456" };
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: false,
      error: null,
    });

    const { result } = renderHook(() => useIsSuperadmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
    expect(supabase.rpc).toHaveBeenCalledWith("is_superadmin", { _user_id: "user-456" });
  });

  it("shows loading state while fetching", async () => {
    const mockUser = { id: "user-789" };
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(supabase.rpc).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: false, error: null }), 100)
        )
    );

    const { result } = renderHook(() => useIsSuperadmin(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(false);
  });
});