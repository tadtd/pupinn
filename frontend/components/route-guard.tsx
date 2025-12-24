"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

type StaffRole = "admin" | "receptionist" | "cleaner";

/**
 * Check if a user role has access to a required role based on hierarchy:
 * - admin can access admin, receptionist, and cleaner routes
 * - receptionist can access receptionist and cleaner routes
 * - cleaner can only access cleaner routes
 */
function hasRoleAccess(userRole: string | undefined, requiredRole: StaffRole | undefined): boolean {
  if (!requiredRole) {
    // No specific role required, any staff member can access
    return userRole === "admin" || userRole === "receptionist" || userRole === "cleaner";
  }

  if (!userRole) return false;

  // Role hierarchy: admin > receptionist > cleaner
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    receptionist: 2,
    cleaner: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  // User can access if their level is >= required level
  return userLevel >= requiredLevel;
}

/**
 * RouteGuard protects staff-only routes from guest access.
 * Supports role hierarchy: admin > receptionist > cleaner
 */
export function RouteGuard({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: StaffRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('RouteGuard check:', { 
        userRole: user?.role, 
        requiredRole, 
        hasAccess: user ? hasRoleAccess(user.role, requiredRole) : false 
      });
    }

    // Check if user is staff and has required role access
    if (user && hasRoleAccess(user.role, requiredRole)) {
      setIsChecking(false);
      return;
    }

    // Redirect guest users
    if (user && user.role === "guest") {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to staff members.",
        variant: "destructive",
      });
      router.push("/guest");
      return;
    }

    // Redirect unauthenticated users to staff login
    if (!user) {
      router.push("/staff/login");
      return;
    }

    // User doesn't have required role
    if (user && !hasRoleAccess(user.role, requiredRole)) {
      toast({
        title: "Access Denied",
        description: `This page requires ${requiredRole} access or higher.`,
        variant: "destructive",
      });
      // Redirect based on user's role
      if (user.role === "admin") {
        router.push("/staff/admin/rooms");
      } else if (user.role === "receptionist") {
        router.push("/staff/receptionist/dashboard");
      } else if (user.role === "cleaner") {
        router.push("/staff/cleaner/dashboard");
      } else {
        router.push("/staff/login");
      }
      return;
    }

    setIsChecking(false);
  }, [user, isLoading, router, pathname, toast, requiredRole]);

  // Show nothing while checking (prevents flash of protected content)
  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // User is staff with required access - render protected content
  return <>{children}</>;
}

