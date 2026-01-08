
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Projects from '../pages/Projects';
import { ThemeProvider } from '@/contexts/ThemeContext';
import userEvent from '@testing-library/user-event';

// Hoist mocks
const { 
  mockUseOrganization, 
  mockUseProjects, 
  mockUseCreateProject, 
  mockUseUpdateProject,
  mockUseDeleteProject,
  mockUseClients,
  mockUseToast,
  mockSignOut,
  mockUseIsSuperadmin
} = vi.hoisted(() => {
  return {
    mockUseOrganization: vi.fn(),
    mockUseProjects: vi.fn(),
    mockUseCreateProject: vi.fn(),
    mockUseUpdateProject: vi.fn(),
    mockUseDeleteProject: vi.fn(),
    mockUseClients: vi.fn(),
    mockUseToast: vi.fn(),
    mockSignOut: vi.fn(),
    mockUseIsSuperadmin: vi.fn(),
  }
})

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
        user: { email: 'superadmin@example.com' },
        signOut: mockSignOut,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Sidebar dependencies
vi.mock('@/components/ui/sidebar', () => ({
    Sidebar: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  useSidebar: () => ({ state: 'expanded' }),
    SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{ children } </div>,
  SidebarTrigger: () => <button>Toggle Sidebar</button>,
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  default: () => <div>Sidebar Mock</div>
}));


// Mock other hooks
vi.mock('@/hooks/useOrganization', () => ({
    useOrganization: () => mockUseOrganization(),
}));

vi.mock('@/hooks/useProjects', () => ({
    useProjects: () => mockUseProjects(),
    usePaginatedProjects: () => mockUseProjects(),
    useCreateProject: () => mockUseCreateProject(),
    useUpdateProject: () => mockUseUpdateProject(),
    useDeleteProject: () => mockUseDeleteProject(),
}));

vi.mock('@/hooks/useClients', () => ({
    useClients: () => mockUseClients(),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockUseToast }),
    toast: mockUseToast,
}));

vi.mock('@/hooks/useIsSuperadmin', () => ({
    useIsSuperadmin: () => mockUseIsSuperadmin(),
}));

describe('Superadmin Project Creation', () => {
    let queryClient: QueryClient;
    const mockCreateMutateAsync = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        // Mock Superadmin
        mockUseIsSuperadmin.mockReturnValue({
            data: true,
            isLoading: false,
        });

        // Mock Organization (Superadmin is viewing 'Org A')
        mockUseOrganization.mockReturnValue({
            organization: { id: 'org-A', name: 'Organization A' },
            isLoading: false,
        });

        // Mock Projects (Empty initially)
        mockUseProjects.mockReturnValue({
            data: [],
            isLoading: false,
        });

        // Mock Create Project
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

        // Mock Clients: Return clients from different organizations
        mockUseClients.mockReturnValue({
            data: [
                { id: 'client-A', name: 'Client A', organization_id: 'org-A' },
                { id: 'client-B', name: 'Client B', organization_id: 'org-B' }, // Client from another org
            ],
        });
    });

    const renderProjects = () => {
        return render(
            <ThemeProvider>
                <QueryClientProvider client={ queryClient } >
                    <BrowserRouter>
                        <Projects />
                    </BrowserRouter>
                </QueryClientProvider>
            </ThemeProvider>
        );
    };

    it('allows superadmin to create a project for a client from a different organization', async () => {
        const user = userEvent.setup();
        renderProjects();

        // Verify page title
        expect(screen.getByText('Projects')).toBeInTheDocument();

        // Click "New Project"
        const newProjectBtn = screen.getAllByText(/New Project/i)[0];
        await user.click(newProjectBtn);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Fill in Name
        const nameInput = await screen.findByLabelText(/Name \*/i);
        await user.type(nameInput, 'Cross-Org Project');

        // Select Client B (which is from Org B)
        // We need to find the select trigger first
        const clientSelectTrigger = screen.getByRole('combobox', { name: /Client/i });
        await user.click(clientSelectTrigger);

        // Check if Client B is available in the options
        const clientBOption = await screen.findByRole('option', { name: 'Client B' });
        expect(clientBOption).toBeInTheDocument();
        await user.click(clientBOption);

        // Click Create
        const submitBtn = screen.getByRole('button', { name: /Create/i });
        await user.click(submitBtn);

        // Verify createProject was called with correct args
        await waitFor(() => {
            expect(mockCreateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Cross-Org Project',
                client_id: 'client-B',
                organization_id: 'org-A' // Created in the current view context (Org A)
            }));
        });
    });
});
