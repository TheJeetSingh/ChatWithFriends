'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatContainer from '@/components/chat/ChatContainer';
import Link from 'next/link';

// Types for chat data
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

  // Extract chat type and ID from URL params
  const chatType = params.type as ChatType;
  const chatId = params.id as string;

  useEffect(() => {
    if (!user && !isLoading) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    if (!chatId || !chatType || !user) return;

    const fetchChatDetails = async () => {
      setIsLoadingChat(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/chats/${chatType}/${chatId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.statusText}`);
        }
        
        const data = await response.json();
        setChatDetails(data);
      } catch (err: any) {
        console.error('Error fetching chat details:', err);
        setError(err.message || 'Failed to load chat details');
      } finally {
        setIsLoadingChat(false);
      }
    };

    fetchChatDetails();
  }, [user, isLoading, chatId, chatType, router]);

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
        <p className="mb-4">Chat not found or you don't have access.</p>
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
        </div>
      </header>

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