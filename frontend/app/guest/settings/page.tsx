"use client";

import { ChangePasswordForm } from "@/components/change-password-form";

export default function GuestSettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 text-center">Account Settings</h1>
        <p className="text-slate-400 mt-2 text-center">
          Manage your account preferences and security
        </p>
      </div>

      <div className="grid gap-8 max-w-2xl mx-auto">
        <ChangePasswordForm userType="guest" />
      </div>
    </div>
  );
}
