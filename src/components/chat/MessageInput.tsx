import { useState, useRef, FormEvent, KeyboardEvent } from 'react';
import { FiSmile, FiBold, FiItalic, FiUnderline } from 'react-icons/fi';

const EMOJIS = [
  '😀','😁','😂','🤣','😅','😆','😉','😊','😍','😘','😎','🤔','😏','😢','😭','😡','😱','👍','👎','👏','🙏','💪','🔥','✨','🎉','❤️','💔','💯','✅','❌','🌟','🚀','🍕','🍔','🍟','🍩','☕','🍺','⚽','🏀','🎮','🎵','📚','💼'
];

type MessageInputProps = {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
};

export default function MessageInput({ onSendMessage, isLoading = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (wrapperStart: string, wrapperEnd = wrapperStart) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    const newText =
      message.substring(0, start) +
      wrapperStart +
      selectedText +
      wrapperEnd +
      message.substring(end);
    setMessage(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + wrapperStart.length;
      textarea.selectionEnd = end + wrapperStart.length;
    }, 0);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {isFormatting && (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => applyFormatting('**')}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <FiBold className="w-4 h-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('*')}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <FiItalic className="w-4 h-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormatting('__')}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <FiUnderline className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="relative flex items-end space-x-2">
          <div className="flex-1 min-h-[44px] relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send a message..."
              disabled={isLoading}
              className="w-full pr-12 py-2 px-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 min-h-[44px] max-h-32 placeholder-gray-500"
              style={{ height: 'auto', minHeight: '44px' }}
              rows={1}
            />
            <button 
              type="button"
              onClick={() => setIsFormatting(!isFormatting)}
              className="absolute right-2 bottom-2 p-1 hover:bg-gray-100 rounded-full"
            >
              <FiBold className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FiSmile className="w-5 h-5 text-gray-600" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-0 bg-white border border-gray-200 rounded-lg shadow-md p-3 grid grid-cols-8 gap-3 z-10 max-w-xs max-h-60 overflow-y-auto">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="text-2xl hover:bg-gray-100 rounded"
                    onClick={() => {
                      setMessage((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button 
              type="submit" 
              disabled={!message.trim() || isLoading}
              className="bg-blue-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center focus:outline-none hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                    <svg className="h-5 w-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}