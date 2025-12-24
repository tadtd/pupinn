"use client";

import { GuestAuthProvider } from "@/components/guest-auth-provider";
import { GuestNav } from "@/components/guest-nav";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getGuestToken } from "@/lib/guest-auth";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoginPage, setIsLoginPage] = useState(false);

  // Set mounted state after client-side hydration
  useEffect(() => {
    setIsMounted(true);
    setIsLoginPage(pathname === "/guest/login");
  }, [pathname]);

  // Check authentication and redirect if needed (client-side only)
  useEffect(() => {
    if (!isMounted) return;
    
    const isAuthenticated = !!getGuestToken();
    if (!isAuthenticated && !isLoginPage) {
      router.push("/guest/login");
    }
  }, [isMounted, isLoginPage, router]);

  // During SSR and initial render, always render the same structure
  // This prevents hydration mismatches
  if (!isMounted || isLoginPage) {
    return <>{children}</>;
  }

  return (
    <GuestAuthProvider>
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <GuestNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </GuestAuthProvider>
  );
}
