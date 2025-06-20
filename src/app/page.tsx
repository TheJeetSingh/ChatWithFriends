'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Chat With Friends</h1>
        <p className="text-gray-600 mb-8">Loading...</p>
        <div className="animate-pulse flex space-x-4 justify-center">
          <div className="h-4 w-4 bg-blue-400 rounded-full"></div>
          <div className="h-4 w-4 bg-blue-400 rounded-full"></div>
          <div className="h-4 w-4 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
