'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/chat/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { FiUserPlus } from 'react-icons/fi';

type SearchUser = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setSearchResults(data);
      setError(null);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const startDirectChat = async (userId: string) => {
    try {
      const response = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      const chat = await response.json();
      router.push(`/chat/${chat.type}/${chat.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Unable to start the chat. Please try again later.');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar with chats */}
      <Sidebar 
        currentUser={{ id: user.id, name: user.name }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <DashboardHeader 
          searchValue={searchEmail}
          onSearchChange={setSearchEmail}
          onSearchSubmit={() => {
            handleSearch({ preventDefault: () => {} } as unknown as React.FormEvent);
          }}
          userName={user.name}
          onLogout={logout}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <h2 className="text-lg font-medium mb-4 flex items-center">
            <FiUserPlus className="mr-2" />
            Start a New Conversation
          </h2>
          <form onSubmit={handleSearch} className="mb-6 max-w-xl">
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search users by email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="bg-blue-600 text-white px-6 rounded-full hover:bg-blue-700 flex items-center justify-center"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="bg-white shadow rounded-lg divide-y max-w-xl">
              {searchResults.map(result => (
                <div key={result.id} className="flex justify-between items-center p-4">
                  <div>
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-gray-500">{result.email}</p>
                  </div>
                  <button
                    onClick={() => startDirectChat(result.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4 mt-6 max-w-xl">
              {error}
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 