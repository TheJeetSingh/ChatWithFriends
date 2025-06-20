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
      
      // Check if the received message is already in our list (by _id or temp id)
      const messageExists = prevMessages.some(msg => 
        msg._id === data._id || 
        (msg._id.startsWith('temp-') && msg.content === data.content && msg.user.id === data.user.id)
      );
      
      if (messageExists) {
        // Replace the temp message with the real one
        return prevMessages.map(msg => {
          if (msg._id.startsWith('temp-') && msg.content === data.content && msg.user.id === data.user.id) {
            return newMessage;
          }
          return msg;
        });
      } else {
        // If it's a new message (from someone else), add it
        return [...prevMessages, newMessage];
      }
    });
  }, []);

  // Subscribe to Pusher channel for real-time updates
  useEffect(() => {
    // Function to set up Pusher channel
    const setupPusher = () => {
      // Clean up existing connections first
      if (pusherChannel.current) {
        pusherChannel.current.unbind_all();
        pusherClient.unsubscribe(pusherChannel.current.name);
      }
      
      // Subscribe to the channel
      pusherChannel.current = pusherClient.subscribe(channelName);
      
      // Bind to new message events
      pusherChannel.current.bind('new-message', handleNewMessage);
      
      // Bind to subscription succeeded to confirm we're connected
      pusherChannel.current.bind('pusher:subscription_succeeded', () => {
        console.log(`Successfully subscribed to ${channelName} channel`);
      });
    };

    // Set up Pusher connection
    setupPusher();

    // Add heartbeat check to maintain connection and verify it's still active
    const heartbeatInterval = setInterval(() => {
      if (!pusherClient.connection.state || pusherClient.connection.state !== 'connected') {
        console.log('Pusher connection lost, reconnecting...');
        setupPusher();
      }
    }, 30000); // Check every 30 seconds

    // Clean up subscription when component unmounts
    return () => {
      clearInterval(heartbeatInterval);
      if (pusherChannel.current) {
        pusherChannel.current.unbind_all();
        pusherClient.unsubscribe(channelName);
      }
    };
  }, [handleNewMessage, channelName]);

  const handleSendMessage = async (content: string) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    try {
      // Create a temporary message to show immediately
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        content,
        createdAt: new Date(),
        userId: currentUser.id,
        user: {
          id: currentUser.id,
          name: currentUser.name
        }
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Send the message to the server
      const endpoint = chatId && chatType 
        ? `/api/messages/${chatType}/${chatId}`  // Specific chat
        : '/api/messages';                       // Global chat fallback
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary message if sending failed
      setMessages(prev => prev.filter(msg => !msg._id.startsWith('temp-')));
      
      // Fetch messages again to ensure we're in sync
      fetchMessages();
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