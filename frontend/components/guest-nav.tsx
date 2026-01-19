"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useGuestAuth } from "@/components/guest-auth-provider";
import {
  PawPrint,
  LayoutDashboard,
  CalendarPlus,
  ListOrdered,
  LogOut,
  Menu,
  X,
  Hotel,
  Settings,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    title: "Dashboard",
    href: "/guest",
    icon: LayoutDashboard,
  },
  {
    title: "View Rooms",
    href: "/guest/rooms",
    icon: Hotel,
  },
  {
    title: "Book a Room",
    href: "/guest/bookings/new",
    icon: CalendarPlus,
  },
  {
    title: "My Bookings",
    href: "/guest/bookings",
    icon: ListOrdered,
  },
  {
    title: "Settings",
    href: "/guest/settings",
    icon: Settings,
  },
  {
    title: "Chat",
    href: "/guest/chat",
    icon: MessageCircle,
  },
];

export function GuestNav() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useGuestAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't render anything while loading or if not authenticated
  // But show a placeholder skeleton while loading to prevent layout shift
  if (isLoading) {
    return (
      <>
        {/* Skeleton navbar while loading */}
        <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="w-32 h-8 bg-slate-800 rounded animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-24 h-8 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="w-40 h-8 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </nav>
        <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
          <div className="px-4">
            <div className="flex items-center justify-between h-14">
              <div className="w-24 h-7 bg-slate-800 rounded animate-pulse" />
              <div className="w-8 h-8 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </nav>
        <div className="h-16 md:h-16" />
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/guest"
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <div className="w-8 h-8 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <PawPrint className="h-5 w-5 text-slate-900" />
              </div>
              <span className="font-semibold text-lg">Pupinn</span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-amber-500/10 text-amber-400"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                Welcome,{" "}
                <span className="text-slate-200">{user?.full_name}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/guest"
              className="flex items-center gap-2 text-amber-400"
            >
              <div className="w-7 h-7 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <PawPrint className="h-4 w-4 text-slate-900" />
              </div>
              <span className="font-semibold">Pupinn</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-slate-100 p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
            <div className="text-sm text-slate-400 mb-3">
              Welcome, <span className="text-slate-200">{user?.full_name}</span>
            </div>

            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}

            <hr className="border-slate-800 my-3" />

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16 md:h-16" />
    </>
  );
}
