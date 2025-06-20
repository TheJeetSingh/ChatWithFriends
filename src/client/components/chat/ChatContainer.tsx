import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import NavBar from './NavBar';

type ChatType = 'direct' | 'group';

type User = {
  id: string;
  name: string;
};

type Message = {
  _id: string;
  content: string;
  createdAt: Date;
  userId?: string;
  user: User;
};

type ChatContainerProps = {
  currentUser: User | null;
  chatId?: string;
  chatType?: ChatType;
};

export default function ChatContainer({ currentUser, chatId, chatType }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pusherChannel = useRef<any>(null);
  
  // Channel name will be different based on chat type and ID
  const channelName = chatId && chatType ? `${chatType}-${chatId}` : 'chat';

  // Fetch messages function that can be called multiple times
  const fetchMessages = useCallback(async () => {
    try {
      if (!chatId || !chatType) {
        // Global chat fallback
        const response = await fetch('/api/messages', {
          credentials: 'include',
        });
        const data = await response.json();
        
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        
        setMessages(formattedMessages);
      } else {
        // Specific chat
        const response = await fetch(`/api/messages/${chatType}/${chatId}`, {
          credentials: 'include',
        });
        const data = await response.json();
        
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [chatId, chatType]);

  // Initial message load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, chatId, chatType]);

  // Handle new message from Pusher
  const handleNewMessage = useCallback((data: any) => {
    console.log('Received message via Pusher:', data);
    
    setMessages((prevMessages) => {
      // Convert incoming date string to Date object
      const newMessage = {
        ...data,
        createdAt: new Date(data.createdAt)
      };
      
      // Check if message already exists by _id
      const messageExists = prevMessages.some(msg => msg._id === data._id);
      
      if (messageExists) {
        return prevMessages;
      }
      
      // Replace temp message or add new message
      return prevMessages.map(msg => {
        if (msg._id.startsWith('temp-') && 
            msg.content === data.content && 
            msg.user.id === data.user.id) {
          return newMessage;
        }
        return msg;
      }).concat(messageExists ? [] : [newMessage]);
    });
  }, []);

  // Subscribe to Pusher channel for real-time updates
  useEffect(() => {
    if (!channelName) return;

    console.log(`Subscribing to channel: ${channelName}`);
    
    // Subscribe to the channel
    const channel = pusherClient.subscribe(channelName);
    pusherChannel.current = channel;

    // Bind to events
    channel.bind('new-message', handleNewMessage);
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`Successfully subscribed to ${channelName}`);
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error(`Error subscribing to ${channelName}:`, error);
    });

    // Clean up subscription when component unmounts or channel changes
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, handleNewMessage]);

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    setIsLoading(true);
    
    try {
      // Create a temporary message
      const tempMessage: Message = {
        _id: tempId,
        content: content.trim(),
        createdAt: new Date(),
        userId: currentUser.id,
        user: {
          id: currentUser.id,
          name: currentUser.name
        }
      };
      
      // Add temp message to UI
      setMessages(prev => [...prev, tempMessage]);
      
      // Send to server
      const endpoint = chatId && chatType 
        ? `/api/messages/${chatType}/${chatId}`
        : '/api/messages';
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Server will broadcast via Pusher, which will update UI
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-screen bg-white">
      {!chatId && <NavBar username={currentUser.name} />}

      <div className="flex-grow flex flex-col h-0">
        <MessageList 
          messages={messages} 
          currentUserId={currentUser.id} 
        />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
} 