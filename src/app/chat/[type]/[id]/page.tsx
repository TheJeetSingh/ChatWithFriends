'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatContainer from '@/components/chat/ChatContainer';
import Link from 'next/link';

type ChatType = 'direct' | 'group';

type ChatDetails = {
  id: string;
  name: string;
  type: ChatType;
  description?: string;
  memberCount?: number;
};

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResults, setInviteResults] = useState<ChatDetails[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const chatType = params.type as ChatType;
  const chatId = params.id as string;

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
      return;
    }

    if (!chatId || !chatType || !user) return;

    const fetchChatDetails = async () => {
      setIsLoadingChat(true);
      setError(null);
      
      try {
        const endpoint = chatType === 'group' 
          ? `/api/chats/groups/${chatId}`
          : `/api/chats/${chatType}/${chatId}`;

        const response = await fetch(endpoint, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.statusText}`);
        }
        
        const data = await response.json();
        setChatDetails(data);
      } catch (err: unknown) {
        console.error('Error fetching chat details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat details');
      } finally {
        setIsLoadingChat(false);
      }
    };

    fetchChatDetails();
  }, [user, isLoading, chatId, chatType, router]);

  const searchUsers = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(inviteEmail.trim())}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setInviteResults(data);
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setIsInviting(false);
    }
  };

  const addMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/chats/groups/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addMembers: [userId] })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add member');
      }
      setIsAdding(false);
      setInviteEmail('');
      setInviteResults([]);
      setChatDetails(prev => prev ? { ...prev, memberCount: (prev.memberCount || 0) + 1 } : prev);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (isLoading || isLoadingChat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!user || !chatDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="mb-4">Chat not found or you don&apos;t have access.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{chatDetails.name}</h1>
              {chatDetails.type === 'group' && (
                <p className="text-sm text-gray-500">
                  {chatDetails.memberCount} members
                </p>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {chatDetails.type === 'direct' ? 'Direct Message' : 'Group Chat'}
          </div>
          {chatDetails.type === 'group' && (
            <button
              onClick={() => setIsAdding(prev => !prev)}
              className="ml-4 text-sm text-blue-600 hover:text-blue-800"
            >
              {isAdding ? 'Close' : 'Add Members'}
            </button>
          )}
        </div>
      </header>

      {isAdding && (
        <div className="bg-gray-50 border-t border-b py-4 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="User email"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <button
                onClick={searchUsers}
                disabled={isInviting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                {isInviting ? 'Searching' : 'Search'}
              </button>
            </div>
            {inviteError && <p className="text-red-600 text-sm mb-2">{inviteError}</p>}
            {inviteResults.length > 0 && (
              <div className="border rounded divide-y max-h-60 overflow-y-auto">
                {inviteResults.map(u => (
                  <div key={u.id} className="p-2 flex justify-between items-center">
                    <span>{u.name}</span>
                    <button
                      onClick={() => addMember(u.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ChatContainer 
        currentUser={{
          id: user.id,
          name: user.name
        }}
        chatId={chatId}
        chatType={chatType}
      />
    </div>
  );
}