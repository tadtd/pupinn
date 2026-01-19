'use client';

import { useGuestAuth } from '@/components/guest-auth-provider';
import { ChatInterface } from '@/components/chat-interface';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GuestChatPage() {
  const { user, token, isAuthenticated, isLoading } = useGuestAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/guest/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !token) {
    return null;
  }

  return (
    <>
       <ChatInterface 
        currentUser={{
          id: user.id,
          name: user.full_name,
          role: 'guest'
        }}
        token={token}
      />
    </>
  );
}
