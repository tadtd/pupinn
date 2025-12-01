"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Home, Users, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold text-slate-100">HMS</span>
              </div>
              <div className="flex items-center gap-1">
                <Link href="/bookings">
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Bookings
                  </Button>
                </Link>
                <Link href="/rooms">
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Rooms
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/users">
                    <Button
                      variant="ghost"
                      className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Users
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {user?.username} ({user?.role})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-400 hover:text-slate-100 hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-slate-400 mt-1">
            Hotel Management System Dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/bookings/new">
            <Card className="bg-slate-800/80 border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-slate-900" />
                </div>
                <CardTitle className="text-slate-100">New Booking</CardTitle>
                <CardDescription className="text-slate-400">
                  Create a new guest reservation
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/bookings">
            <Card className="bg-slate-800/80 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-slate-100">View Bookings</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage existing reservations
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/rooms">
            <Card className="bg-slate-800/80 border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-slate-100">
                  Room Management
                </CardTitle>
                <CardDescription className="text-slate-400">
                  View and manage room inventory
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {isAdmin && (
            <Link href="/users">
              <Card className="bg-slate-800/80 border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer group">
                <CardHeader>
                  <div className="w-12 h-12 bg-linear-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-slate-100">
                    User Management
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage staff accounts (Admin only)
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>

        {/* Quick Stats Placeholder */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-100">--</div>
              <div className="text-sm text-slate-400">
                Today&apos;s Check-ins
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-100">--</div>
              <div className="text-sm text-slate-400">
                Today&apos;s Check-outs
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-100">--</div>
              <div className="text-sm text-slate-400">Occupied Rooms</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-100">--</div>
              <div className="text-sm text-slate-400">Available Rooms</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
