import React, { useState, useRef, useEffect } from 'react';
import testService from '../../utils/apiService';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export const AIChatTab: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load sessions from local storage
    const saved = localStorage.getItem('aiChatSessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0 && !activeSessionId) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) { }
    }

    // Check if there's a pending context from DetailedResult page
    const pendingContext = localStorage.getItem('pendingAiChat');
    if (pendingContext) {
      localStorage.removeItem('pendingAiChat');
      createNewSession(pendingContext);
    }
  }, []);

  const saveSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('aiChatSessions', JSON.stringify(newSessions));
  };

  const createNewSession = (initialMessage?: string) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: initialMessage ? [{ role: 'user', content: initialMessage }] : [],
      updatedAt: Date.now()
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
    
    if (initialMessage) {
      // Auto-trigger the first message if it came from DetailedResult
      triggerInitialAnalysis(newSession.id, initialMessage, updated);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const triggerInitialAnalysis = async (sessionId: string, text: string, currentSessions: ChatSession[]) => {
    setIsLoading(true);
    try {
      const history = [{ role: 'user', content: text }];
      const res = await testService.chatWithCode('', '', '', history as any);
      
      const newHistory: ChatMessage[] = [...history as any, { role: 'assistant', content: res.data.reply }];
      const title = "Code Review: " + text.substring(0, 30).replace(/\n/g, ' ') + "...";
      
      const updated = currentSessions.map(s => 
        s.id === sessionId ? { ...s, messages: newHistory, title, updatedAt: Date.now() } : s
      );
      saveSessions(updated);
    } catch (err: any) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    let targetSessionId = activeSessionId;
    let currentSessions = sessions;
    let newHistory: ChatMessage[] = [];

    if (!targetSessionId || !activeSession) {
      // Create one on the fly if none exists
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: text.substring(0, 30) + '...',
        messages: [{ role: 'user', content: text }],
        updatedAt: Date.now()
      };
      targetSessionId = newSession.id;
      setActiveSessionId(targetSessionId);
      currentSessions = [newSession, ...sessions];
      newHistory = newSession.messages;
    } else {
      newHistory = [...messages, { role: 'user', content: text }];
      currentSessions = sessions.map(s => 
        s.id === targetSessionId ? { ...s, messages: newHistory, updatedAt: Date.now(), title: s.messages.length === 0 ? text.substring(0,30) + '...' : s.title } : s
      );
    }
    
    saveSessions(currentSessions);
    setInput('');
    setIsLoading(true);

    try {
      const res = await testService.chatWithCode('', '', '', newHistory);
      const finalHistory = [...newHistory, { role: 'assistant', content: res.data.reply }];
      saveSessions(currentSessions.map(s => 
        s.id === targetSessionId ? { ...s, messages: finalHistory as any, updatedAt: Date.now() } : s
      ));
    } catch (err: any) {
      const finalHistory = [...newHistory, { role: 'assistant', content: `Error: ${err.response?.data?.message || 'Failed'}` }];
      saveSessions(currentSessions.map(s => 
        s.id === targetSessionId ? { ...s, messages: finalHistory as any, updatedAt: Date.now() } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-background border border-border rounded-sm overflow-hidden">
      
      {/* Sidebar for chat history */}
      <div className="w-full md:w-64 h-auto md:h-auto bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0">
        <div className="p-3 md:p-4 border-b border-border shrink-0">
          <button 
            onClick={() => createNewSession()}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors border border-primary/20"
          >
            <span>+</span> New Chat
          </button>
        </div>
        <div className="overflow-x-auto md:overflow-x-hidden md:overflow-y-auto custom-scrollbar p-2 flex flex-row md:flex-col gap-2 shrink-0 md:flex-1">
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`flex shrink-0 w-48 md:w-auto items-center justify-between p-3 rounded-sm cursor-pointer transition-colors text-sm group ${
                activeSessionId === s.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
              }`}
            >
              <div className="truncate flex-1 font-sans">{s.title}</div>
              <button 
                onClick={(e) => deleteSession(s.id, e)}
                className="md:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 ml-2"
                title="Delete Chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div 
          ref={scrollRef}
          className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6"
        >
          {!activeSession || messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-muted/50 border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-xl font-sans text-foreground-bold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground text-sm max-w-md italic font-light">
                I am your dedicated Groq AI assistant. You can ask me to write code snippets, explain algorithms, or help you generate new test questions.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-md p-4 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm' 
                    : 'bg-muted border border-border text-foreground font-sans rounded-tl-none shadow-sm prose prose-sm max-w-none prose-invert'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-md rounded-tl-none shadow-sm p-4 text-sm text-muted-foreground italic flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Thinking...
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-border p-4 bg-muted/20 shrink-0">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message Groq AI..."
              className="flex-1 bg-background border border-border rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-cream-500 transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-cream-950 hover:bg-cream-900 disabled:opacity-50 text-white px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center min-w-[100px]"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
