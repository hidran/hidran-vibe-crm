/*
 * AppSidebar - Main navigation sidebar for authenticated users
 *
 * This component renders the application's primary navigation sidebar with
 * menu items, user profile, and quick actions. It supports collapsible mode
 * (icon-only) and conditionally shows superadmin-only menu items.
 *
 * SECTIONS:
 * 1. Header: App logo and name
 * 2. Content: Main navigation menu with route links
 * 3. Footer: User profile, settings, theme toggle, sign out
 *
 * FEATURES:
 * - Collapsible to icon-only mode (controlled by SidebarProvider)
 * - Active route highlighting
 * - Conditional rendering of superadmin menu items
 * - Tooltips in collapsed mode for accessibility
 * - User avatar with initials fallback
 * - Quick access to profile, theme, and sign out
 *
 * MENU STRUCTURE:
 * - Standard items: Dashboard, Projects, Tasks, Task Board, Clients, Users, Invoices
 * - Superadmin-only: Organizations (shown only when user is superadmin)
 *
 * STATE:
 * - collapsed: Boolean indicating if sidebar is in icon-only mode
 * - location.pathname: Current route for active state highlighting
 * - user: Current authenticated user from AuthContext
 * - isSuperadmin: Boolean from useIsSuperadmin hook
 *
 * BEHAVIOR:
 * - Active route highlighted with different background color
 * - In collapsed mode: Shows only icons with tooltips
 * - In expanded mode: Shows icons + text labels
 * - Organizations menu item hidden until superadmin status loads
 * - Footer items always visible (avatar, settings, theme, logout)
 *
 * RESPONSIVE:
 * - Desktop: Persistent sidebar with collapsible behavior
 * - Mobile: Sidebar becomes slide-out sheet (handled by SidebarProvider)
 * - Icons remain same size, text labels hide in collapsed mode
 *
 * NAVIGATION:
 * - All items use React Router Link for SPA navigation
 * - Avatar and Settings icon both link to /profile
 * - Logo links to /dashboard
 *
 * USAGE:
 *   <SidebarProvider>
 *     <AppSidebar />
 *     {Page content}
 *   </SidebarProvider>
 */

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSuperadmin } from "@/hooks/useIsSuperadmin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Briefcase,
  FileText,
  LogOut,
  Building2,
  UserCircle,
  LayoutGrid,
  Settings,
} from "lucide-react";
import ThemeSettings from "@/components/theme/ThemeSettings";

/*
 * Main navigation menu items
 *
 * Each item includes:
 * - title: Display text for menu item
 * - url: Route path for navigation
 * - icon: Lucide icon component
 *
 * NOTE: Organizations menu item is added conditionally in the component
 * based on superadmin status, not included in this static array.
 */
const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: Briefcase },
  { title: "Tasks", url: "/tasks", icon: FolderKanban },
  { title: "Task Board", url: "/tasks/board", icon: LayoutGrid },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Users", url: "/users", icon: UserCircle },
  { title: "Invoices", url: "/invoices", icon: FileText },
];

const AppSidebar = () => {
  const { state } = useSidebar(); // "expanded" | "collapsed"
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: isSuperadmin, isLoading: isSuperadminLoading } = useIsSuperadmin();

  const collapsed = state === "collapsed";

  /*
   * Check if the given path matches the current route
   * Used to highlight the active menu item
   */
  const isActive = (path: string) => location.pathname === path;

  /*
   * Generate user initials for avatar fallback
   * Uses first 2 characters of email, uppercase
   */
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon">
      {/*
       * Header: App branding and logo
       * Links to dashboard on click
       * Logo always visible, text hidden when collapsed
       */}
      <SidebarHeader className="border-b border-border p-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <FolderKanban className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="text-lg font-semibold">ProjectHub</span>}
        </Link>
      </SidebarHeader>

      {/*
       * Main navigation menu
       *
       * Renders all standard menu items plus conditionally renders
       * Organizations item for superadmins. Each item shows active
       * state when its route matches current location.
       */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Standard menu items (always visible) */}
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title} // Shown in collapsed mode
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/*
               * Superadmin-only menu item: Organizations
               *
               * Conditionally rendered based on:
               * 1. Superadmin status must be loaded (!isLoading)
               * 2. User must be superadmin (isSuperadmin === true)
               *
               * This prevents flickering and ensures proper access control
               */}
              {!isSuperadminLoading && isSuperadmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/organizations")}
                    tooltip="Organizations"
                  >
                    <Link to="/organizations">
                      <Building2 className="h-4 w-4" />
                      <span>Organizations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/*
       * Footer: User profile and actions
       *
       * LAYOUT: Avatar | Email | Settings | Theme | Logout
       *
       * In collapsed mode:
       * - Avatar remains visible
       * - Email text hidden
       * - Icon buttons remain visible
       *
       * ACTIONS:
       * - Avatar click → Profile page
       * - Settings icon → Profile page
       * - Theme icon → Theme selector dropdown
       * - Logout icon → Sign out action
       */}
      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          {/* User avatar - links to profile page */}
          <Link to="/profile">
            <Avatar className="h-8 w-8 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* User email - hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          )}

          {/* Settings button - links to profile page */}
          <Link to="/profile">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              title="Profile Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          {/* Theme toggle - opens theme selector */}
          <ThemeSettings />

          {/* Sign out button - triggers auth sign out */}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
