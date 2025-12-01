"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  LogOut,
  LogIn,
  NotebookPen,
  Users,
  BedDouble,
  Shield,
  PawPrint,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const NAVIGATION = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: Home },
      { title: "Bookings", href: "/bookings", icon: CalendarDays },
      { title: "Rooms", href: "/rooms", icon: BedDouble },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Create Booking", href: "/bookings/new", icon: NotebookPen },
      { title: "Create Room", href: "/rooms/new", icon: BedDouble },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="bg-linear-to-br from-slate-950 via-slate-900 to-slate-950/90">
      <SidebarHeader className="border-transparent px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <span className="text-sm font-semibold">
              <PawPrint className="h-4 w-4" />
            </span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                Pupinn
              </p>
              <h2 className="text-xl font-semibold text-white">
                Hotel Console
              </h2>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        {NAVIGATION.map((section) => (
          <SidebarGroup key={section.label}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] tracking-wide text-slate-400">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {section.items
                .filter((item) =>
                  // Receptionists should not see "Create Room" in the sidebar
                  item.title === "Create Room" ? isAdmin : true
                )
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className={cn(
                        "group/sidebar-item transition-colors",
                        isCollapsed ? "px-2 justify-center" : "px-3"
                      )}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-2"
                        title={isCollapsed ? item.title : undefined}
                      >
                        <item.icon className="h-4 w-4 text-amber-300 transition-transform duration-150 group-hover/sidebar-item:scale-110 group-hover/sidebar-item:text-amber-200" />
                        {!isCollapsed && (
                          <span className="font-medium text-slate-100 transition-colors duration-150 group-hover/sidebar-item:text-slate-50">
                            {item.title}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] tracking-wide text-slate-400">
              Hospitality Insights
            </SidebarGroupLabel>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-10 w-10 rounded-lg bg-amber-500/10 p-2 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Stay Pulse</p>
                  <p className="text-xs text-slate-400">
                    Track arrivals and departures in real time.
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="mt-4 w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
              >
                <Link href="/bookings">View Timeline</Link>
              </Button>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-transparent">
        {isAuthenticated ? (
          <>
            {isCollapsed ? (
              <div className="flex justify-center">
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white">
                <div className="flex items-center gap-3">
                  <Users className="h-9 w-9 rounded-full bg-slate-900/80 p-2 text-amber-300" />
                  <div>
                    <p className="font-semibold">
                      {user?.username ?? "Team Member"}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      {isAdmin ? (
                        <>
                          <Shield className="h-3 w-3" /> Admin
                        </>
                      ) : (
                        "Receptionist"
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-center gap-2 border border-white/10 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {isCollapsed ? (
              <div className="flex justify-center">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  title="Sign in"
                >
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-50">
                <p className="font-semibold mb-1">Not signed in</p>
                <p className="text-xs text-amber-100/80 mb-3">
                  Sign in to manage bookings and rooms.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="w-full justify-center gap-2 bg-amber-500 text-slate-900 hover:bg-amber-400 cursor-pointer"
                >
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span>Sign in</span>
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
