import { useRef, useEffect } from 'react';
import Message from './Message';

type MessageType = {
  _id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
  };
};

type MessageListProps = {
  messages: MessageType[];
  currentUserId: string | null;
};

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // If there are no messages, show a placeholder
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <Message
          key={message._id}
          content={message.content}
          sender={{
            name: message.user.name || 'Anonymous',
          }}
          timestamp={message.createdAt}
          isCurrentUser={message.user.id === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 