import { useRef, useEffect } from 'react';
import Message from './Message';
import { format } from 'date-fns';

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

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, MessageType[]>, message) => {
    const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // If there are no messages, show a placeholder
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500 text-center mb-2">No messages yet</p>
        <p className="text-gray-400 text-sm text-center">Start the conversation by sending a message</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-2">
          <div className="flex items-center justify-center">
            <div className="bg-gray-200 rounded-full px-3 py-1">
              <span className="text-xs text-gray-600">
                {format(new Date(date), 'EEEE, MMMM d')}
              </span>
            </div>
          </div>
          
          {dateMessages.map((message, index) => {
            const prevMessage = index > 0 ? dateMessages[index - 1] : null;
            const nextMessage = index < dateMessages.length - 1 ? dateMessages[index + 1] : null;
            
            const isFirstInGroup = !prevMessage || prevMessage.user.id !== message.user.id;
            const isLastInGroup = !nextMessage || nextMessage.user.id !== message.user.id;
            
            return (
              <Message
                key={message._id}
                content={message.content}
                sender={{
                  name: message.user.name || 'Anonymous',
                }}
                timestamp={message.createdAt}
                isCurrentUser={message.user.id === currentUserId}
                showAvatar={isLastInGroup}
                showName={isFirstInGroup}
                showTimestamp={isLastInGroup}
              />
            );
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 