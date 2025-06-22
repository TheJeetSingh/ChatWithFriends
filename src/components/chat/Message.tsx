import { format } from 'date-fns';
import { FiMoreHorizontal } from 'react-icons/fi';

type MessageProps = {
  content: string;
  sender: {
    name: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  showTimestamp?: boolean;
};

export default function Message({ 
  content, 
  sender, 
  timestamp, 
  isCurrentUser,
  showAvatar = true,
  showName = true,
  showTimestamp = true
}: MessageProps) {
  return (
    <div className={`group flex items-end gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - only show for last message in group */}
      {showAvatar ? (
        <div className="flex-shrink-0 w-8 h-8">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
            {sender.name.charAt(0)}
          </div>
        </div>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Sender name - only show for first message in group */}
        {showName && !isCurrentUser && (
          <div className="text-sm text-gray-500 mb-1 px-2">
            {sender.name}
          </div>
        )}
        
        {/* Message content */}
        <div className="group relative">
          <div className={`px-4 py-2 rounded-2xl ${
            isCurrentUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            <p className="whitespace-pre-wrap break-words">{content}</p>
          </div>
          
          {/* Message actions - visible on hover */}
          <div className={`absolute top-0 ${
            isCurrentUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
          } h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button className="p-1 hover:bg-gray-100 rounded-full">
              <FiMoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Timestamp - only show for last message in group */}
        {showTimestamp && (
          <div className="text-xs text-gray-400 mt-1 px-2">
            {format(timestamp, 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
} 