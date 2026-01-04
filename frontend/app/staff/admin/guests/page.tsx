"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import { GuestSearch } from "@/components/admin/guest-search";
import { GuestProfile } from "@/components/admin/guest-profile";
import { getGuestProfile } from "@/lib/api/guests";
import { type GuestResponse, type GuestProfileResponse } from "@/lib/validators";

export default function AdminGuestsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedGuest, setSelectedGuest] = useState<GuestProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSelectGuest = async (guest: GuestResponse) => {
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const profile = await getGuestProfile(guest.id);
      setSelectedGuest(profile);
    } catch (err: unknown) {
      setProfileError("Failed to load guest profile. Please try again.");
      console.error("Profile load error:", err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedGuest(null);
    setProfileError(null);
  };

  const handleProfileUpdate = async () => {
    if (selectedGuest) {
      // Reload profile after update
      setIsLoadingProfile(true);
      try {
        const profile = await getGuestProfile(selectedGuest.guest.id);
        setSelectedGuest(profile);
      } catch (err: unknown) {
        console.error("Failed to reload profile:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
  };

  if (authLoading) {
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
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            {selectedGuest ? (
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBackToSearch}
                  variant="ghost"
                  className="text-slate-300 hover:text-slate-100"
                >
                  ← Back to Search
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-100">Guest Profile</h1>
                  <p className="text-slate-400 mt-1">
                    {selectedGuest.guest.full_name || selectedGuest.guest.email}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-slate-100">Guest CRM</h1>
                <p className="text-slate-400 mt-1">
                  Search for guests and manage their information
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          {selectedGuest ? (
            <div>
              {isLoadingProfile ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  Loading profile...
                </div>
              ) : profileError ? (
                <div className="p-4 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                  {profileError}
                </div>
              ) : (
                <GuestProfile
                  guest={selectedGuest.guest}
                  bookingHistory={selectedGuest.booking_history}
                  onUpdate={handleProfileUpdate}
                />
              )}
            </div>
          ) : (
            <GuestSearch onSelectGuest={handleSelectGuest} />
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

