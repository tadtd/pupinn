// Adapted from shadcn/ui sidebar component.
// Source: https://ui.shadcn.com/docs/components/sidebar

"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  setState: (state: "expanded" | "collapsed") => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function SidebarProvider({
  children,
  defaultState = "expanded",
}: {
  children: React.ReactNode;
  defaultState?: "expanded" | "collapsed";
}) {
  const [state, setInternalState] = React.useState<"expanded" | "collapsed">(
    defaultState
  );

  // Read the sidebar state from cookies on the client *after* hydration
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));

    if (!cookie) return;

    const value = cookie.split("=")[1];
    if (value === "expanded" || value === "collapsed") {
      setInternalState(value);
    }
  }, [defaultState]);

  const setState = React.useCallback(
    (value: "expanded" | "collapsed") => {
      setInternalState(value);
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      }
    },
    [setInternalState]
  );

  return (
    <SidebarContext.Provider value={{ state, setState }}>
      <div className={cn("flex min-h-screen w-full bg-background")}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export function Sidebar({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useSidebar();
  return (
    <aside
      data-state={state}
      className={cn(
        "group/sidebar border-r border-(--sidebar-border) bg-(--sidebar) text-(--sidebar-foreground) transition-[width] duration-200",
        "flex h-full flex-col bg-linear-to-b from-slate-950 to-slate-900/90",
        state === "collapsed" ? "w-16" : "w-64",
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-(--sidebar-border) px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-3 py-4", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-t border-(--sidebar-border) px-3 py-3 text-sm text-(--sidebar-foreground)/70",
        className
      )}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-6", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-(--sidebar-foreground)/60",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />;
}

type SidebarMenuButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
  asChild?: boolean;
};

export function SidebarMenuButton({
  className,
  isActive,
  asChild = false,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground)",
        isActive
          ? "bg-(--sidebar-primary) text-(--sidebar-primary-foreground) shadow-md shadow-amber-500/20"
          : "text-(--sidebar-foreground)",
        className
      )}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { state, setState } = useSidebar();
  return (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700",
        className
      )}
      onClick={() => setState(state === "collapsed" ? "expanded" : "collapsed")}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

export function SidebarRail({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "hidden border-l border-(--sidebar-border) lg:block",
        className
      )}
      {...props}
    />
  );
}

export function SidebarCollapsibleButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { state, setState } = useSidebar();
  return (
    <button
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-(--sidebar-border) text-(--sidebar-foreground) transition hover:bg-(--sidebar-accent)",
        className
      )}
      onClick={() => setState(state === "collapsed" ? "expanded" : "collapsed")}
      {...props}
    >
      {state === "collapsed" ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
      <span className="sr-only">Collapse sidebar</span>
    </button>
  );
}
