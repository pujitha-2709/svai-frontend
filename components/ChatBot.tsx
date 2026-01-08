import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { dbService } from '../services/dbService';
import { peerRecommendationService } from '../services/peerRecommendationService';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your SkillVouch AI assistant. I can help you find peers, verify skills, and navigate the platform. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = async (userMessage: string): Promise<string> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerMessage = userMessage.toLowerCase();
    
    // AI SQL Query Generation - Database-only approach
    if (lowerMessage.includes('show') || lowerMessage.includes('find') || 
        lowerMessage.includes('list') || lowerMessage.includes('get') ||
        lowerMessage.includes('sql') || lowerMessage.includes('c') || 
        lowerMessage.includes('python') || lowerMessage.includes('peers') ||
        lowerMessage.includes('students') || lowerMessage.includes('experts') ||
        lowerMessage.includes('beginners') || lowerMessage.includes('advanced') ||
        lowerMessage.includes('all')) {
      
      try {
        // Step 1: Generate SQL query from user message
        const sqlResponse = await fetch('/api/ai-sql-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage })
        });

        if (!sqlResponse.ok) {
          throw new Error('Failed to generate SQL query');
        }

        const sqlData = await sqlResponse.json();
        
        if (sqlData.intent === 'unclear') {
          return sqlData.responseText;
        }

        // Step 2: Execute the generated SQL query
        const execResponse = await fetch('/api/execute-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sqlQuery: sqlData.sqlQuery,
            params: sqlData.params
          })
        });

        if (!execResponse.ok) {
          throw new Error('Failed to execute SQL query');
        }

        const execData = await execResponse.json();
        
        // Step 3: Format results according to specification
        if (execData.data && execData.data.length > 0) {
          let response = 'Here are the matching peers:\n';
          
          execData.data.forEach((peer: any) => {
            response += `• ${peer.name} – ${peer.course} (${peer.level})\n`;
          });

          return response.trim();
        } else {
          return 'No matching peers found.';
        }

      } catch (error) {
        console.error('AI SQL query error:', error);
        return 'Sorry, I encountered an error while processing your request. Please try again.';
      }
    }
    
    // Skill verification responses
    if (lowerMessage.includes('verify') || lowerMessage.includes('skill') || lowerMessage.includes('quiz')) {
      return 'To verify your skills: 1) Go to "My Skills" in sidebar 2) Click "Add Skill" 3) Select your skill level 4) Take the verification quiz 5) Once you pass, your skill will be verified with a checkmark ✅';
    }
    
    // Navigation help
    if (lowerMessage.includes('navigate') || lowerMessage.includes('how') || lowerMessage.includes('help')) {
      return 'Here\'s how to navigate SkillVouch AI:\n• Dashboard: Overview of your activity\n• My Skills: Add and verify your skills\n• Find Peers: Discover learning partners\n• Messages: Chat with matched peers\n• Profile: Manage your account settings\n\n💡 **Pro tip**: Ask me "show SQL students" or "find C experts" to get database results!';
    }
    
    // Account help
    if (lowerMessage.includes('account') || lowerMessage.includes('profile') || lowerMessage.includes('settings')) {
      return 'For account management, go to Profile in the sidebar. There you can update your personal information, skills, availability preferences, and communication settings.';
    }
    
    // Default response
    return 'I\'m here to help you query our database! You can ask me about:\n• **Peer Search**: "show SQL students", "find C experts"\n• **Course Queries**: "list all Python peers", "get Advanced SQL learners"\n• **Skill Verification**: "how to verify my skills"\n• **Platform Navigation**: "how to use the platform"\n\nAll queries use real database data with safe SQL generation.';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const botResponse = await generateBotResponse(inputMessage);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 group"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute bottom-full right-0 mb-2 bg-slate-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Chat with AI Assistant
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">SkillVouch AI Assistant</h3>
            <p className="text-xs text-indigo-200">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-white hover:bg-indigo-700 p-1 rounded transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'bot' && <Bot className="w-4 h-4 mt-0.5 text-indigo-600" />}
                {message.sender === 'user' && <User className="w-4 h-4 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 rounded-lg max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white p-2 rounded-lg transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
