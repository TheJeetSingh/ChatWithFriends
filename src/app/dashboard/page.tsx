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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      const queryKey = searchTerm.includes('@') ? 'email' : 'name';
      fetch(`/api/users/search?${queryKey}=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data);
          setError(null);
        })
        .catch((err) => {
          console.error('Error searching users:', err);
          setError('Failed to search users. Please try again.');
        })
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    setIsSearching(true);
    try {
      const queryKey = searchTerm.includes('@') ? 'email' : 'name';
      const res = await fetch(`/api/users/search?${queryKey}=${encodeURIComponent(searchTerm)}`, {
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
      <Sidebar 
        currentUser={{ id: user.id, name: user.name }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
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
          <form onSubmit={handleSearch} className="mb-8 w-full max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by email or name"
                className="flex-1 px-5 py-4 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 text-base shadow-sm bg-white placeholder-gray-500"
              />
              <button 
                type="submit"
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white px-8 py-3 rounded-full text-base font-medium shadow-md"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="bg-white shadow-lg rounded-2xl divide-y border border-gray-200 max-w-2xl">
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