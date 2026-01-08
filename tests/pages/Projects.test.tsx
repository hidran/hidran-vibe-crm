import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Projects from '@/pages/Projects';
import { ThemeProvider } from '@/contexts/ThemeContext';
import userEvent from '@testing-library/user-event';

// Hoist mocks
const mockUseOrganization = vi.fn();
const mockUseProjects = vi.fn();
const mockUsePaginatedProjects = vi.fn();
const mockUseCreateProject = vi.fn();
const mockUseUpdateProject = vi.fn();
const mockUseDeleteProject = vi.fn();
const mockUseClients = vi.fn();
const mockUseToast = vi.fn();
const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

// Mock React Router DOM
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    signOut: mockSignOut,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Sidebar dependencies
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({ state: 'expanded' }),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button>Toggle Sidebar</button>,
}));


// Mock other hooks
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => mockUseProjects(),
  usePaginatedProjects: () => mockUsePaginatedProjects(),
  useCreateProject: () => mockUseCreateProject(),
  useUpdateProject: () => mockUseUpdateProject(),
  useDeleteProject: () => mockUseDeleteProject(),
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: () => mockUseClients(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockUseToast }),
}));

vi.mock('@/hooks/useIsSuperadmin', () => ({
  useIsSuperadmin: () => ({ data: false, isLoading: false }),
}));

describe('Projects Page Integration', () => {
  let queryClient: QueryClient;
  const mockCreateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-1', name: 'Test Org' },
      isLoading: false,
    });

    mockUsePaginatedProjects.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
    });

    mockUseCreateProject.mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    });

    mockUseUpdateProject.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseDeleteProject.mockReturnValue({
      mutateAsync: vi.fn(),
    });

    mockUseClients.mockReturnValue({
      data: [{ id: 'client-1', name: 'Test Client' }],
    });
  });

  const renderProjects = () => {
    return render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Projects />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };

  it('navigates to create project page when clicking New Project', async () => {
    const user = userEvent.setup();
    renderProjects();

    const newProjectBtn = screen.getAllByText(/New Project/i)[0];
    await user.click(newProjectBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
  });
});