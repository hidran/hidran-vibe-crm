/*
 * DashboardLayout - Main layout component for authenticated pages
 *
 * This component provides the standard layout structure for all authenticated
 * pages in the application. It includes a collapsible sidebar navigation,
 * page header with title and optional actions, and the main content area.
 *
 * STRUCTURE:
 * ┌─────────────────────────────────────┐
 * │ Sidebar │ Header (sticky)           │
 * │  (nav)  │ ├─ Title & Description    │
 * │         │ └─ Action Buttons         │
 * │         │                           │
 * │         │ Main Content Area         │
 * │         │                           │
 * └─────────────────────────────────────┘
 *
 * FEATURES:
 * - Collapsible sidebar with icon-only mode
 * - Sticky header that stays visible on scroll
 * - Responsive design (sidebar becomes sheet on mobile)
 * - Flexible action button placement in header
 * - Consistent spacing and styling across all pages
 *
 * PROPS:
 * - children: Page content to render in the main area
 * - title: Page title displayed in header (required)
 * - description: Optional subtitle/description text
 * - actions: Optional action buttons (e.g., "New Project", "Export")
 *
 * BEHAVIOR:
 * - SidebarProvider manages sidebar open/closed state
 * - SidebarTrigger button toggles sidebar visibility
 * - Header is sticky (z-index 40) to stay above content
 * - Actions are right-aligned on desktop, left-aligned on mobile
 * - Full-height layout with flex to push footer down
 *
 * RESPONSIVE:
 * - Mobile: Sidebar becomes slide-out sheet, actions stack vertically
 * - Tablet/Desktop: Sidebar is persistent, actions in single row
 * - Padding adjusts: 4 (mobile) → 6 (desktop)
 *
 * USAGE:
 *   <DashboardLayout
 *     title="Projects"
 *     description="Manage your project portfolio"
 *     actions={<Button>New Project</Button>}
 *   >
 *     <ProjectsList />
 *   </DashboardLayout>
 */

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;      // Page content to render in main area
  title: string;            // Page title displayed in header
  description?: string;     // Optional subtitle text
  actions?: ReactNode;      // Optional header action buttons
}

const DashboardLayout = ({ children, title, description, actions }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Navigation sidebar with collapsible behavior */}
        <AppSidebar />

        {/* Main content area with header and page content */}
        <SidebarInset className="flex-1">
          {/*
           * Sticky Header
           *
           * LAYOUT: Flexbox with sidebar trigger, title/description, and actions
           * STICKY: Remains visible at top during scroll (z-index 40)
           * RESPONSIVE: Vertical layout on mobile, horizontal on desktop
           */}
          <header className="sticky top-0 z-40 flex min-h-16 h-auto items-center gap-4 border-b border-border bg-background px-4 py-4 md:px-6 md:py-0">
            {/* Hamburger button to toggle sidebar */}
            <SidebarTrigger className="-ml-2" />

            {/* Title, description, and actions container */}
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
              {/* Page title and optional description */}
              <div className="space-y-1">
                <h1 className="text-xl font-semibold leading-none">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>

              {/* Optional action buttons (e.g., "New", "Export", etc.) */}
              {actions && <div className="flex items-center gap-2 self-start md:self-auto">{actions}</div>}
            </div>
          </header>

          {/*
           * Main content area
           *
           * PADDING: Responsive padding (4 on mobile, 6 on desktop)
           * FLEX: flex-1 to take remaining height
           */}
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
