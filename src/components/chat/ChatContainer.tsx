import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import Sidebar from './Sidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import { Channel } from 'pusher-js';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pusherChannel = useRef<Channel | null>(null);
  
  const channelName = chatId && chatType ? `${chatType === 'direct' ? 'direct' : 'group'}-${chatId}` : 'chat';

  useEffect(() => {
    // Check Pusher connection state and reconnect if needed
    if (pusherClient.connection.state !== 'connected') {
      console.log('Ensuring Pusher connection is established');
      pusherClient.connect();
    }
    
    return () => {
      // Clean up any existing channel subscriptions when component unmounts
      if (pusherChannel.current) {
        pusherChannel.current.unbind_all();
        if (channelName) {
          pusherClient.unsubscribe(channelName);
        }
      }
    };
  }, [channelName]);

  const fetchMessages = useCallback(async () => {
    try {
      if (!chatId || !chatType) {
        const response = await fetch('/api/messages', {
          credentials: 'include',
        });
        const data = await response.json();
        
        const formattedMessages = data.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        
        setMessages(formattedMessages);
      } else {
        const response = await fetch(`/api/messages/${chatType}/${chatId}`, {
          credentials: 'include',
        });
        const data = await response.json();
        
        const formattedMessages = data.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [chatId, chatType]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, chatId, chatType]);

  const handleNewMessage = useCallback((data: Message) => {
    console.log('Received message via Pusher:', data);
    
    setMessages((prevMessages) => {
      const newMessage = {
        ...data,
        createdAt: new Date(data.createdAt)
      };
      
      const messageExists = prevMessages.some(msg => msg._id === data._id);
      if (messageExists) {
        return prevMessages;
      }
      
      const updatedMessages = prevMessages.filter(msg => {
        return !(msg._id.startsWith('temp-') && 
                msg.content === data.content && 
                msg.user.id === data.user.id);
      });
      
      return [...updatedMessages, newMessage];
    });
  }, []);

  const handleDeletedMessage = useCallback((data: { messageId: string }) => {
    console.log('Message deleted via Pusher:', data);
    setMessages(prevMessages => 
      prevMessages.filter(msg => msg._id !== data.messageId)
    );
  }, []);

  useEffect(() => {
    if (!channelName) return;

    console.log(`Subscribing to channel: ${channelName}`);
    
    // Unsubscribe from any existing channel first
    if (pusherChannel.current) {
      pusherChannel.current.unbind_all();
      pusherClient.unsubscribe(channelName);
    }

    // Check if Pusher is connected, if not, connect
    if (pusherClient.connection.state !== 'connected') {
      pusherClient.connect();
    }

    // Subscribe to the channel
    const channel = pusherClient.subscribe(channelName);
    pusherChannel.current = channel;

    channel.bind('new-message', handleNewMessage);
    channel.bind('delete-message', handleDeletedMessage);
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`Successfully subscribed to ${channelName}`);
    });

    channel.bind('pusher:subscription_error', (error: Error) => {
      console.error(`Error subscribing to ${channelName}:`, error);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (pusherClient.connection.state === 'connected') {
          console.log(`Attempting to resubscribe to ${channelName}`);
          pusherClient.subscribe(channelName);
        } else {
          console.log('Reconnecting Pusher before resubscribing');
          pusherClient.connect();
        }
      }, 2000);
    });

    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [channelName, handleNewMessage, handleDeletedMessage]);

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    setIsLoading(true);
    
    try {
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
      
      setMessages(prev => [...prev, tempMessage]);
      
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

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser || !chatId || !chatType) return;
    
    try {
      const endpoint = `/api/messages/${chatType}/${chatId}/${messageId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      // Optimistically remove from UI
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-white">
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-200`}
      >
        <Sidebar 
          currentUser={currentUser}
          selectedChatId={chatId}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader 
          chatType={chatType}
          chatId={chatId}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          <MessageList 
            messages={messages} 
            currentUserId={currentUser.id} 
            onDeleteMessage={handleDeleteMessage}
          />
          <MessageInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
} 