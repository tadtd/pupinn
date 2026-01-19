'use client';

import { useAuth } from '@/components/auth-provider';
import { ChatInterface } from '@/components/chat-interface';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // Get token from localStorage as it's not exposed in useAuth context directly
    // but we know it's stored there for staff
    const storedToken = localStorage.getItem('hms_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <ChatInterface 
      currentUser={{
        id: user.id,
        name: user.username,
        role: user.role
      }}
      token={token}
    />
  );
}
