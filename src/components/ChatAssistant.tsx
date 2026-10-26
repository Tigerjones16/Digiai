import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  ExternalLink, 
  Trash2, 
  AlertCircle,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { NewsItem } from '../server/rssService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    id: string;
    title: string;
    sourceUrl: string;
    sourceName: string;
  }>;
  degraded?: boolean;
  timestamp: number;
}

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  preloadedContextItem: NewsItem | null;
  onClearPreloadedContext: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  isOpen,
  onClose,
  preloadedContextItem,
  onClearPreloadedContext,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am DigAI's factual assistant. I answer questions strictly based on today's active news items, verified free courses, and research digests. If an answer is not in today's feed, I will tell you directly.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (preloadedContextItem) {
      setInput(`What are the key facts regarding "${preloadedContextItem.title}"?`);
    }
  }, [preloadedContextItem]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');
    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit reached (10 requests/min). Please pause for a moment.');
        } else if (res.status === 400) {
          throw new Error('Invalid prompt. Please ensure your query is under 2000 characters.');
        } else {
          throw new Error('AI service temporarily unavailable. Please retry shortly.');
        }
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text || "I don't have that in today's news.",
        citations: data.citations || [],
        degraded: Boolean(data.degraded),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete query.');
    } finally {
      setIsLoading(false);
      if (preloadedContextItem) {
        onClearPreloadedContext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <aside 
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#0c0c10] border-l border-white/10 flex flex-col shadow-2xl animate-slide-in"
      role="complementary"
      aria-label="DigAI News Chat Assistant"
    >
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between bg-[#121216]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0071e3] flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">DigAI Assistant</h2>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Grounded Daily News Retrieval</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([messages[0]])}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/50 hover:text-white rounded-lg"
            aria-label="Clear chat messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/50 hover:text-white rounded-lg"
            aria-label="Close chat assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Preloaded context chip */}
      {preloadedContextItem && (
        <div className="p-2.5 mx-3 mt-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/30 flex items-center justify-between text-xs text-white">
          <span className="truncate font-medium">Focus: {preloadedContextItem.title}</span>
          <button
            onClick={onClearPreloadedContext}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white"
            aria-label="Clear story focus"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#0071e3] flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0071e3] text-white rounded-tr-xs'
                    : 'bg-white/[0.05] border border-white/10 text-white/90 rounded-tl-xs'
                }`}
              >
                {/* Security 11: Display degraded state clearly */}
                {msg.degraded && (
                  <div className="mb-2.5 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>AI Model Busy • Showing Relevant News Directly</span>
                  </div>
                )}

                {/* Plain text rendering (React safely escapes by default) */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations if available */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-mono text-white/40 block">
                      Cited Sources:
                    </span>
                    {msg.citations.map((c) => (
                      <a
                        key={c.id}
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-1 p-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-[#42a5f5]"
                      >
                        <span className="truncate">{c.title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-[#0071e3]/30 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-white/60 p-2">
            <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-ping" />
            <span>Searching retrieved news articles & verifying facts...</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested quick queries */}
      <div className="p-2.5 border-t border-white/5 bg-[#0e0e12] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          'Free courses with certificates?',
          'What are the latest AI research papers?',
          'What new tools were published today?',
        ].map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="min-h-[44px] px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80 whitespace-nowrap active:scale-95 transition-all"
            aria-label={`Ask query: ${q}`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form (44px touch targets) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-white/10 bg-[#121216] flex items-center gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">Ask a question about today's AI intelligence</label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ask about today's AI news or courses..."
          className="flex-1 min-h-[44px] px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 outline-none focus:border-[#0071e3]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0071e3] disabled:opacity-40 hover:bg-[#0077ed] text-white flex items-center justify-center transition-all shadow-md"
          aria-label="Send question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
