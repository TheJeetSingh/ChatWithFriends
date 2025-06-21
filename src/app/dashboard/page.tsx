'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Chat = {
  id: string;
  name: string;
  type: 'direct' | 'group';
  lastMessage?: string;
  lastMessageTime?: Date;
};

type SearchUser = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchChats = useCallback(async () => {
    try {
      // Verify session is still valid with retries
      let retries = 3;
      let sessionVerified = false;
      let sessionData;
      
      while (retries > 0 && !sessionVerified) {
        try {
          const sessionRes = await fetch('/api/auth/session', {
            credentials: 'include'
          });
          sessionData = await sessionRes.json();
          
          if (sessionRes.ok && sessionData.user) {
            sessionVerified = true;
            break;
          }
          
          // Wait between retries with increasing delay
          await new Promise(resolve => setTimeout(resolve, (4 - retries) * 200));
        } catch (err) {
          console.warn('Session verification attempt failed:', err);
        }
        retries--;
      }
      
      if (!sessionVerified) {
        console.log('Session verification failed, redirecting to login');
        router.push('/login');
        return;
      }

      // Fetch direct chats
      const directRes = await fetch('/api/chats/direct', {
        credentials: 'include',
      });
      if (!directRes.ok) {
        if (directRes.status === 401) {
          // Unauthorized - redirect to login
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch direct chats: ${directRes.statusText}`);
      }
      const directChats = await directRes.json();

      // Fetch group chats
      const groupRes = await fetch('/api/chats/groups', {
        credentials: 'include',
      });
      if (!groupRes.ok) {
        if (groupRes.status === 401) {
          // Unauthorized - redirect to login
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch group chats: ${groupRes.statusText}`);
      }
      const groupChats = await groupRes.json();

      // Combine and sort by last activity
      const allChats = [...(directChats || []), ...(groupChats || [])].sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setChats(allChats);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      setError('Failed to load chats. Please try again.');
    }
  }, [router]);

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    } else if (user) {
      fetchChats();
    }
  }, [user, isLoading, router, fetchChats]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/chats/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: groupName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create group');
      }
      
      const newGroup = await response.json();
      setChats([newGroup, ...chats]);
      setGroupName('');
      setIsCreatingGroup(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

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
    } catch (error) {
      console.error('Error searching users:', error);
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
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Chat Dashboard</h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-700">Signed in as {user.name}</p>
            <button 
              onClick={() => logout()} 
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar - Chat list */}
          <div className="col-span-1">
            <div className="bg-white shadow rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Your Conversations</h2>
                <button 
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="text-blue-600 text-sm hover:text-blue-800"
                >
                  {isCreatingGroup ? 'Cancel' : 'New Group'}
                </button>
              </div>

              {isCreatingGroup && (
                <form onSubmit={handleCreateGroup} className="mb-4">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                    required
                  />
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Create Group
                  </button>
                </form>
              )}

              <div className="divide-y divide-gray-200">
                {chats.length > 0 ? (
                  chats.map(chat => (
                    <Link 
                      href={`/chat/${chat.type}/${chat.id}`}
                      key={chat.id}
                      className="block py-3 hover:bg-gray-50 px-2 -mx-2 rounded-md"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{chat.name}</span>
                        <span className="text-xs text-gray-500">
                          {chat.type === 'direct' ? 'DM' : 'Group'}
                        </span>
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate mt-1">{chat.lastMessage}</p>
                      )}
                    </Link>
                  ))
                ) : (
                  <p className="text-center py-4 text-gray-500">No conversations yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right content - Search users */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-medium mb-4">Find Users</h2>
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Search by email"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {searchResults.length > 0 && (
                <div className="border rounded-md divide-y">
                  {searchResults.map(result => (
                    <div key={result.id} className="flex justify-between items-center p-3">
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

              <div className="mt-6">
                <h3 className="text-md font-medium mb-2">Quick Start</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use the search above to find users and start direct messages.
                  Or create a new group chat for multiple people.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
      </main>
    </div>
  );
} 