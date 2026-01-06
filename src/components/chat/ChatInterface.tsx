import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  Bot, 
  User, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { openaiApi, type ChatMessage, type ChatResponse } from '../../lib/openaiApi';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Card from '../common/Card';

interface ChatInterfaceProps {
  onClose?: () => void;
  initialMood?: number;
}

interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  is_bookmarked: boolean;
}

const ChatInterface = ({ onClose, initialMood }: ChatInterfaceProps) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "I'm feeling anxious and overwhelmed",
    "I need help relaxing and calming down",
    "I'm going through a difficult time",
    "I feel sad and don't know why",
    "I'm struggling with loneliness",
    "I'm having trouble sleeping",
    "I feel angry and frustrated",
    "I need someone to listen to me"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add initial greeting based on mood
    if (initialMood && messages.length === 0) {
      const greeting = getInitialGreeting(initialMood);
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: Date.now()
      }]);
    }
  }, [initialMood]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitialGreeting = (mood: number): string => {
    if (mood <= 2) {
      return "I can sense you might be going through a difficult time. I'm here to listen and support you. What's on your mind?";
    } else if (mood === 3) {
      return "Hello! I'm here to chat and support you. How are you feeling today?";
    } else {
      return "Hi there! It's great to connect with you. What would you like to talk about today?";
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await openaiApi.sendMessage(messages, textToSend);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLastResponse(response);

      // Save conversation to database
      await saveConversation([...messages, userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Your feelings are valid and you're not alone. If you're in crisis, please reach out to 988 or emergency services.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (conversationMessages: ChatMessage[]) => {
    if (!user || conversationMessages.length < 2) return;

    try {
      const title = conversationMessages[0]?.content.substring(0, 50) + '...' || 'Chat Session';
      
      if (conversationId) {
        // Update existing conversation
        await supabase
          .from('chat_conversations')
          .update({
            messages: conversationMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            title,
            messages: conversationMessages,
            is_bookmarked: isBookmarked
          })
          .select()
          .single();

        if (error) throw error;
        setConversationId(data.id);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleBookmark = async () => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from('chat_conversations')
        .update({ is_bookmarked: !isBookmarked })
        .eq('id', conversationId);
      
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Error bookmarking conversation:', error);
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
      setLastResponse(null);
      setConversationId(null);
      setIsBookmarked(false);
    }
  };

  const handleRecommendationClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div className="flex items-center space-x-2">
          <Bot className="text-primary-500" size={20} />
          <h3 className="font-semibold text-neutral-900">Yaresa Chat Bot</h3>
        </div>
        <div className="flex items-center space-x-2">
          {conversationId && (
            <button
              onClick={handleBookmark}
              className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark conversation'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="text-primary-500" size={18} />
              ) : (
                <Bookmark className="text-neutral-500" size={18} />
              )}
            </button>
          )}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="text-neutral-500" size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="mx-auto text-neutral-400 mb-4" size={48} />
            <h4 className="text-lg font-medium text-neutral-900 mb-2">
              Start a conversation
            </h4>
            <p className="text-neutral-600 mb-6">
              I'm here to listen and support you. Choose a prompt below or share what's on your mind.
            </p>
            
            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
              {suggestedPrompts.slice(0, 4).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3 text-sm text-left bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <Bot size={16} className="text-primary-500 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.timestamp && (
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {message.role === 'user' && (
                  <User size={16} className="text-white mt-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-primary-500" />
                <Loader2 size={16} className="animate-spin text-neutral-500" />
                <span className="text-sm text-neutral-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Crisis Support Alert */}
      {lastResponse?.needsCrisisSupport && (
        <div className="mx-4 mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="text-error-600" size={16} />
            <span className="font-medium text-error-800">Immediate Support Available</span>
          </div>
          <p className="text-error-700 text-sm mb-2">
            I'm concerned about what you're sharing. Please consider reaching out for immediate support.
          </p>
          <div className="flex space-x-2">
            <a 
              href="tel:988"
              className="text-xs bg-error-600 text-white px-3 py-1 rounded-md hover:bg-error-700 transition-colors"
            >
              Call 988
            </a>
            <button
              onClick={() => handleRecommendationClick('/emergency')}
              className="text-xs bg-white text-error-600 border border-error-600 px-3 py-1 rounded-md hover:bg-error-50 transition-colors"
            >
              Crisis Resources
            </button>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {lastResponse?.recommendedActions && lastResponse.recommendedActions.length > 0 && !lastResponse.needsCrisisSupport && (
        <div className="mx-4 mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <h4 className="font-medium text-primary-800 mb-2">Helpful Resources</h4>
          <div className="space-y-2">
            {lastResponse.recommendedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleRecommendationClick(action.url)}
                className="w-full text-left p-2 bg-white rounded-md hover:bg-primary-100 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-primary-700 text-sm">{action.title}</span>
                    <p className="text-xs text-primary-600">{action.description}</p>
                  </div>
                  <ExternalLink size={14} className="text-primary-500 group-hover:text-primary-700" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Suggestions */}
      {lastResponse?.suggestions && lastResponse.suggestions.length > 0 && (
        <div className="mx-4 mb-4">
          <p className="text-xs text-neutral-600 mb-2">You might also want to explore:</p>
          <div className="flex flex-wrap gap-2">
            {lastResponse.suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion)}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 px-3 py-1 rounded-full transition-colors"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            variant="primary"
            icon={<Send size={18} />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;