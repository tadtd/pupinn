"use client";

import Link from "next/link";
import { useGuestAuth } from "@/components/guest-auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ListOrdered, Hotel, Sparkles } from "lucide-react";

export default function GuestDashboardPage() {
  const { user } = useGuestAuth();

  return (
    <div className="space-y-8 px-8 py-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">
          Welcome back, {user?.full_name?.split(" ")[0] || "Guest"}!
        </h1>
        <p className="text-slate-400">
          Manage your hotel bookings and explore available rooms.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/guest/rooms">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer group h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Hotel className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-slate-100">View Rooms</CardTitle>
              <CardDescription className="text-slate-400">
                Browse available rooms and amenities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                View Rooms
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/guest/bookings/new">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all duration-200 cursor-pointer group h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarPlus className="h-6 w-6 text-slate-900" />
              </div>
              <CardTitle className="text-slate-100">Book a Room</CardTitle>
              <CardDescription className="text-slate-400">
                Search available rooms and make a new reservation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/guest/bookings">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group h-full">
            <CardHeader>
              <div className="w-12 h-12 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ListOrdered className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-slate-100">My Bookings</CardTitle>
              <CardDescription className="text-slate-400">
                View and manage your existing reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
              >
                View Bookings
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-slate-800/50 border-slate-700 h-full">
          <CardHeader>
            <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Hotel className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-slate-100">About Pupinn</CardTitle>
            <CardDescription className="text-slate-400">
              Experience comfort and hospitality at its finest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Located in the heart of the city, Pupinn offers modern amenities
              and exceptional service for both business and leisure travelers.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <Card className="bg-linear-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <CardTitle className="text-slate-100">Guest Benefits</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-slate-200">Easy Booking</h3>
              <p className="text-sm text-slate-400">
                Book your stay in just a few clicks with our streamlined
                reservation system.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-200">
                Flexible Cancellation
              </h3>
              <p className="text-sm text-slate-400">
                Cancel your upcoming bookings anytime before check-in at no
                extra cost.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-200">Booking History</h3>
              <p className="text-sm text-slate-400">
                Access your complete booking history and track all your
                reservations in one place.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Your Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">Name</span>
            <span className="text-slate-200">{user?.full_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">Email</span>
            <span className="text-slate-200">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Account Type</span>
            <span className="text-amber-400 capitalize">{user?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
