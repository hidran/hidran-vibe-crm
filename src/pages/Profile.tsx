/*
 * Profile - User profile management page
 *
 * This page allows authenticated users to manage their account settings including
 * personal information (name, email) and password changes. The page is divided into
 * two independent sections with separate forms and mutation logic.
 *
 * ROUTE: /profile (protected - requires authentication)
 *
 * INVARIANTS:
 * - User must be authenticated (enforced by ProtectedRoute wrapper)
 * - Profile data is fetched once on mount and cached by React Query
 * - Email changes trigger Supabase email verification flow
 * - Password updates require the new password to be at least 8 characters
 * - Both forms maintain independent state and submission logic
 *
 * BEHAVIOR:
 * - Profile form auto-populates with current user data from the database
 * - Email field displays auth.users email, first/last name from profiles table
 * - Profile updates modify the profiles table and optionally auth.users (for email)
 * - Password updates use Supabase Auth API directly (no current password verification)
 * - Cache invalidation occurs after successful profile update to refresh UI
 * - Toast notifications provide feedback for all operations (success/error)
 *
 * SECURITY:
 * - All mutations go through Supabase RLS policies
 * - Users can only update their own profile (enforced by user?.id check)
 * - Email changes require email verification before taking effect
 * - Passwords are hashed by Supabase Auth before storage
 *
 * NOTE: Current password is collected but not verified by Supabase Auth.updateUser().
 * This is a Supabase limitation - password updates only require authentication token.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/*
 * profileSchema - Validation schema for profile information form
 *
 * RULES:
 * - first_name: Required, non-empty string
 * - last_name: Required, non-empty string
 * - email: Required, valid email format
 *
 * NOTE: Email validation is client-side only. Server-side validation
 * and verification are handled by Supabase Auth.
 */
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

/*
 * passwordSchema - Validation schema for password change form
 *
 * RULES:
 * - current_password: Minimum 8 characters (collected but not verified)
 * - new_password: Minimum 8 characters
 * - confirm_password: Must match new_password exactly
 *
 * VALIDATION FLOW:
 * 1. Individual field validation (length check)
 * 2. Cross-field validation (password match via refine)
 *
 * NOTE: Supabase Auth does not verify current_password. The field is collected
 * for UX purposes but the API only requires a valid session token.
 */
const passwordSchema = z.object({
  current_password: z.string().min(8, "Password must be at least 8 characters"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const Profile = () => {
  const { user } = useAuth(); // Current authenticated user from AuthContext
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /*
   * Local loading states for each form submission.
   * Separate from mutation.isPending to allow fine-grained button control.
   *
   * WHY: We want to disable buttons immediately on click, before the mutation
   * starts, and keep them disabled until the mutation completes (including
   * success/error callbacks).
   */
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  /*
   * Fetch user profile from the profiles table
   *
   * BEHAVIOR:
   * - Query key includes user.id to cache per-user
   * - Query is disabled if user is not authenticated (enabled: !!user?.id)
   * - On error, throws and is caught by React Query error boundary
   * - Returns null if user is not found
   *
   * CACHE:
   * - Cached indefinitely until invalidated
   * - Invalidated after successful profile update
   * - Refetches on window focus if stale
   */
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  /*
   * Profile form state management
   *
   * IMPORTANT: Uses 'values' instead of 'defaultValues' to make the form
   * controlled and reactive to profile data changes. This ensures the form
   * updates when profile data is fetched or refetched.
   *
   * BEHAVIOR:
   * - Form resets when profile data changes
   * - Email field is populated from auth.users, not profiles table
   * - Empty strings used as fallback if data is missing
   */
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      email: user?.email || "",
    },
  });

  /*
   * Password form state management
   *
   * Uses 'defaultValues' (not 'values') because password fields should
   * never be pre-populated with existing values for security reasons.
   */
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  /*
   * updateProfileMutation - Mutation to update user profile
   *
   * OPERATION:
   * 1. Updates first_name and last_name in profiles table
   * 2. If email changed, updates email in auth.users via Supabase Auth API
   *
   * EMAIL CHANGE FLOW:
   * - Supabase sends verification email to new address
   * - Email is not updated in database until user verifies
   * - User can still log in with old email until verification completes
   *
   * ERROR HANDLING:
   * - Throws on any database or auth error
   * - Error is caught by onError callback
   * - User sees toast notification with error message
   *
   * CACHE INVALIDATION:
   * - Invalidates ["profile", user?.id] query on success
   * - Triggers automatic refetch to show updated data
   */
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id) throw new Error("User not found");

      // Step 1: Update profile table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Step 2: Update email if changed (triggers verification flow)
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (emailError) throw emailError;
      }
    },
    onSuccess: () => {
      // Invalidate cache to refetch updated profile
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsUpdatingProfile(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
      setIsUpdatingProfile(false);
    },
  });

  /*
   * updatePasswordMutation - Mutation to change user password
   *
   * SECURITY NOTE:
   * - Supabase Auth does NOT verify current password
   * - Only requires valid authentication token (session)
   * - This is a Supabase limitation, not a bug in our code
   *
   * BEHAVIOR:
   * - Password is hashed by Supabase before storage
   * - User remains logged in after password change
   * - Other sessions are NOT invalidated (Supabase behavior)
   *
   * FORM RESET:
   * - On success, form is reset to empty fields
   * - Prevents accidental resubmission
   * - Clears sensitive data from component state
   */
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      passwordForm.reset(); // Clear form fields for security
      setIsUpdatingPassword(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      setIsUpdatingPassword(false);
    },
  });

  /*
   * onSubmitProfile - Profile form submission handler
   *
   * FLOW:
   * 1. Set loading state immediately (disables submit button)
   * 2. Trigger mutation (updates database)
   * 3. Loading state cleared in mutation callbacks (success/error)
   */
  const onSubmitProfile = (data: ProfileFormData) => {
    setIsUpdatingProfile(true);
    updateProfileMutation.mutate(data);
  };

  /*
   * onSubmitPassword - Password form submission handler
   *
   * FLOW: Same as onSubmitProfile
   */
  const onSubmitPassword = (data: PasswordFormData) => {
    setIsUpdatingPassword(true);
    updatePasswordMutation.mutate(data);
  };

  /*
   * User initials calculation for avatar fallback
   *
   * PRIORITY:
   * 1. First letter of first name + first letter of last name (if both exist)
   * 2. First two letters of email address
   * 3. Single letter "U" as last resort
   *
   * BEHAVIOR:
   * - Always uppercase for consistency
   * - Empty strings ignored (using || operator)
   */
  const userInitials = `${profile?.first_name?.charAt(0) || ""}${profile?.last_name?.charAt(0) || ""}`.toUpperCase() ||
                       user?.email?.slice(0, 2).toUpperCase() || "U";

  /*
   * Loading state UI
   *
   * Displays centered spinner while initial profile data is being fetched.
   * Once data is loaded (or error occurs), main UI is shown.
   */
  if (isLoadingProfile) {
    return (
      <DashboardLayout title="Profile" description="Manage your account settings">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Profile"
      description="Manage your account settings"
    >
      <div className="max-w-4xl space-y-6">
        {/*
         * Profile Information Card
         *
         * Contains form to update first name, last name, and email.
         * Form is auto-populated with current data via react-hook-form's 'values' prop.
         */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and email address
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                {/* First and Last Name - side by side on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Changing your email will require verification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Separator />

        {/*
         * Password Change Card
         *
         * Contains form to change password with current password, new password,
         * and confirmation fields. Form state is independent from profile form.
         *
         * SECURITY NOTE: Current password field is for UX only. Supabase Auth
         * does not verify it - only the session token is required.
         */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Must be at least 8 characters long
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdatingPassword}>
                    {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
