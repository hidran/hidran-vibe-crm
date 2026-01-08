import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SuperadminRoute from "./SuperadminRoute";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";

// Mock dependencies
vi.mock("@/hooks/useIsSuperadmin");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

describe("SuperadminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  it("shows loading state while checking superadmin status", () => {
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    const { container } = render(
      <SuperadminRoute>
        <div>Protected Content</div>
      </SuperadminRoute>,
      { wrapper }
    );

    // Should show loading spinner (check for the spinner SVG element)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects non-superadmin users to dashboard", () => {
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: false,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as any);

    render(
      <SuperadminRoute>
        <div>Protected Content</div>
      </SuperadminRoute>,
      { wrapper }
    );

    // Should redirect to dashboard
    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children for superadmin users", () => {
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: true,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as any);

    render(
      <SuperadminRoute>
        <div>Protected Content</div>
      </SuperadminRoute>,
      { wrapper }
    );

    // Should render the protected content
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  it("redirects when superadmin status is undefined after loading", () => {
    vi.mocked(useIsSuperadmin).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as any);

    render(
      <SuperadminRoute>
        <div>Protected Content</div>
      </SuperadminRoute>,
      { wrapper }
    );

    // Should redirect to dashboard when data is undefined but not loading
    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
