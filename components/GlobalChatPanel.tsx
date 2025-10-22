'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, FileText, Users, Calendar, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import Image from 'next/image';

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
};

interface SpeakerTranscript {
  speaker: string;
  text: string;
  timestamp: string;
}

interface MeetingData {
  id: string;
  title?: string;
  name?: string;
  timestamp: number;
  notes?: string;
  transcript?: string;
  'speaker transcript'?: { [key: string]: SpeakerTranscript };
  audioURL?: string;
  emoji?: string;
  actionItems?: any;
  tags?: string[];
}

// Function to generate avatar URL from email
const getAvatarUrl = (email: string) => {
  const firstLetter = email?.charAt(0).toUpperCase() || 'U';
  return `https://ui-avatars.com/api/?name=${firstLetter}&background=6366f1&color=fff&size=32`;
};

export default function GlobalChatPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [transcriptCount, setTranscriptCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener('toggle-global-chat', handleToggle);
    return () => {
      window.removeEventListener('toggle-global-chat', handleToggle);
    };
  }, []);

  // Fetch meeting stats when panel opens
  useEffect(() => {
    async function fetchMeetingStats() {
      if (!isOpen || !user?.email || isLoadingStats) return;
      
      setIsLoadingStats(true);
      try {
        const meetingsRef = collection(getFirebaseDb(), 'transcript', user.email, 'timestamps');
        const meetingsQuery = query(meetingsRef, orderBy('timestamp', 'desc'));
        const meetingsSnapshot = await getDocs(meetingsQuery);
        
        const meetings: MeetingData[] = meetingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MeetingData[];
        
        setMeetingsCount(meetings.length);
        
        // Calculate stats
        let transcriptsWithContent = 0;
        const allParticipants = new Set<string>();
        
        meetings.forEach(meeting => {
          if (meeting.transcript || meeting['speaker transcript']) {
            transcriptsWithContent++;
          }
          
          // Count unique participants
          if (meeting['speaker transcript']) {
            Object.values(meeting['speaker transcript']).forEach(segment => {
              if (segment.speaker) {
                allParticipants.add(segment.speaker);
              }
            });
          }
        });
        
        setTranscriptCount(transcriptsWithContent);
        setTotalParticipants(allParticipants.size);
        
        // Set enhanced initial message if no messages exist
        if (messages.length === 0) {
          setMessages([{
            id: '1',
            content: `Hi! I'm Wisp, your AI assistant. I have access to ${meetings.length} meetings with ${transcriptsWithContent} transcripts, featuring ${allParticipants.size} unique participants. I can help you search, analyze, and extract insights from all your meeting data. What would you like to know?`,
            isUser: false,
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        // console.error('Error fetching meeting stats:', error);
        if (messages.length === 0) {
          setMessages([{
            id: '1',
            content: `Hi! I'm Wisp, your AI assistant. I can help you analyze your meetings and find insights. How can I help you today?`,
            isUser: false,
            timestamp: new Date(),
          }]);
        }
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchMeetingStats();
  }, [isOpen, user?.email, messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          includeAllMeetings: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      }]);
    } catch (error) {
      // console.error('Error getting AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    'What were the key decisions in my recent meetings?',
    'Find all action items from this week',
    'Who participated most in discussions?',
    'Summarize meeting patterns and trends',
    'Find mentions of specific topics or keywords',
    'What are the pending follow-ups?',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Wisp AI Assistant</h2>
            {!isLoadingStats && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {meetingsCount}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {transcriptCount}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {totalParticipants}
                </span>
              </div>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 || (messages.length === 1 && !messages[0].isUser) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-2 overflow-hidden">
              <Image
                src="/darkpurp.png"
                alt="AI"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            {messages.length > 0 ? (
              <div className="text-sm text-gray-900 dark:text-gray-100 mb-4 whitespace-pre-wrap">
                {messages[0].content}
              </div>
            ) : (
              <p className="font-medium mb-4">How can I help you today?</p>
            )}
            <div className="space-y-2 w-full">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => setInput(question)}
                  className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!message.isUser && (
                <div className="flex-shrink-0 mr-2">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/darkpurp.png"
                      alt="AI"
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain"
                    />
                  </div>
                </div>
              )}
              {message.isUser && (
                <div className="flex-shrink-0 ml-2 order-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={getAvatarUrl(user?.email || '')}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-blue-500 text-white rounded-br-none order-1'
                    : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-2">
              <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden">
                <Image
                  src="/darkpurp.png"
                  alt="AI"
                  width={16}
                  height={16}
                  className="w-4 h-4 object-contain"
                />
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg rounded-bl-none p-3 max-w-[80%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about your meetings..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !input.trim()}
            size="sm"
            className="flex-shrink-0"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
