/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useClients } from "@/hooks/useClients";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import { supabase } from "@/integrations/supabase/client";

// Mock dependencies
vi.mock("@/hooks/useIsSuperadmin");
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("useClients", () => {
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

  it("fetches clients filtered by organization for regular user", async () => {
    // Mock isSuperadmin to return false
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "c1", name: "Client 1" }],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const orgId = "org-123";
    const { result } = renderHook(() => useClients(orgId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("clients");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("organization_id", orgId);
    expect(mockOrder).toHaveBeenCalledWith("name");
  });

  it("fetches ALL clients for superadmin (ignores organization filter)", async () => {
    // Mock isSuperadmin to return true
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: true,
      isLoading: false,
    } as any);

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "c1", name: "Client 1" }, { id: "c2", name: "Client 2" }],
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const orgId = "org-123";
    const { result } = renderHook(() => useClients(orgId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith("clients");
    expect(mockSelect).toHaveBeenCalledWith("*");
    
    // Crucial check: eq("organization_id", ...) should NOT be called
    expect(mockEq).not.toHaveBeenCalledWith("organization_id", expect.anything());
    
    expect(mockOrder).toHaveBeenCalledWith("name");
  });
});
