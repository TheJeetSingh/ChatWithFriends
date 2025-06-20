import { formatDistanceToNow } from 'date-fns';

type MessageProps = {
  content: string;
  sender: {
    name: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
};

export default function Message({ content, sender, timestamp, isCurrentUser }: MessageProps) {
  return (
    <div className={`flex items-start gap-2 mb-4 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
          {sender.name.charAt(0) || '?'}
        </div>
      </div>
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2 rounded-lg ${
          isCurrentUser 
            ? 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}>
          <p>{content}</p>
        </div>
        
        <div className="flex items-center mt-1 text-xs text-gray-500">
          <span>{sender.name}</span>
          <span className="mx-1">•</span>
          <time>{formatDistanceToNow(timestamp, { addSuffix: true })}</time>
        </div>
      </div>
    </div>
  );
} 