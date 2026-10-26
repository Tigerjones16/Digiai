import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Trash2, 
  Bot, 
  User, 
  ExternalLink, 
  Key, 
  Lock,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { ChatMessage, FeedItem } from '../types';
import { retrieveRelevantItems, buildRagPrompt, localSynthesizeResponse } from '../utils/rag';
import { sanitizeQueryForPrivacy } from '../utils/security';
import { soundFx } from '../utils/audio';

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  feedItems: FeedItem[];
  preloadedContextItem: FeedItem | null;
  onClearPreloadedContext: () => void;
  onOpenSecurityModal: () => void;
  hasCustomKey: boolean;
  getUserDecryptedKey: () => Promise<string | null>;
  onSelectFeedItem: (item: FeedItem) => void;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({
  isOpen,
  onClose,
  feedItems,
  preloadedContextItem,
  onClearPreloadedContext,
  onOpenSecurityModal,
  hasCustomKey,
  getUserDecryptedKey,
  onSelectFeedItem,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your DigAI Intelligence Assistant. 

I use **Retrieval-Augmented Generation (RAG)** directly over our real-time AI news cards, free courses, and developer tool updates.

Ask me anything about today's AI releases, free certifications, or benchmark comparisons!`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle preloaded context card if user clicked "Ask AI About This"
  useEffect(() => {
    if (preloadedContextItem) {
      setInputValue(`Tell me more about "${preloadedContextItem.title}". What are the key takeaways and how do I get started?`);
    }
  }, [preloadedContextItem]);

  const quickPrompts = [
    '🎓 Free courses with verified certificates?',
    '⚡ Explain Claude 3.7 hybrid reasoning slider',
    '🛠️ Best open-source coding agents today?',
    '🔬 What is test-time compute scaling?',
  ];

  const handleSend = async (textToSend?: string) => {
    const rawQuery = textToSend || inputValue;
    if (!rawQuery.trim() || isLoading) return;

    soundFx.playTap();
    const query = rawQuery.trim();
    setInputValue('');

    // Privacy shield: sanitize query before processing
    const sanitizedQuery = sanitizeQueryForPrivacy(query);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. RAG Retrieval Step
      let relevantItems: FeedItem[] = [];
      if (preloadedContextItem) {
        relevantItems = [preloadedContextItem, ...retrieveRelevantItems(sanitizedQuery, feedItems, 2).map((r) => r.item).filter((i) => i.id !== preloadedContextItem.id)];
      } else {
        relevantItems = retrieveRelevantItems(sanitizedQuery, feedItems, 3).map((r) => r.item);
      }

      // 2. Build RAG prompt with ground truth context
      const ragPrompt = buildRagPrompt(sanitizedQuery, relevantItems);

      // 3. Check for User Custom Encrypted Key
      let userKey: string | null = null;
      try {
        userKey = await getUserDecryptedKey();
      } catch (err) {
        console.warn('Could not decrypt user key:', err);
      }

      let answerText = '';

      // Try server / Gemini API endpoint first
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: ragPrompt,
            userApiKey: userKey || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.fallback || !data.text) {
            answerText = localSynthesizeResponse(sanitizedQuery, relevantItems);
          } else {
            answerText = data.text;
          }
        } else {
          // Fallback to grounded local synthesis engine
          answerText = localSynthesizeResponse(sanitizedQuery, relevantItems);
        }
      } catch {
        // Fallback to grounded local synthesis engine
        answerText = localSynthesizeResponse(sanitizedQuery, relevantItems);
      }

      const citations = relevantItems.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
      }));

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        timestamp: Date.now(),
        citations,
        ragContextCount: relevantItems.length,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      soundFx.playNotification();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue retrieving the latest intelligence. Please try again or check your encrypted API key configuration.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      if (preloadedContextItem) {
        onClearPreloadedContext();
      }
    }
  };

  const handleClearChat = () => {
    soundFx.playTap();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat history cleared. What topic or free course would you like to explore next?',
        timestamp: Date.now(),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <aside 
      className="fixed top-0 sm:top-28 bottom-0 right-0 z-40 w-full sm:w-[480px] apple-glass border-l border-white/10 flex flex-col shadow-2xl backdrop-blur-[24px] bg-[#09090b]/95 transition-transform duration-300 ease-out"
      aria-label="DigAI Intelligence Chatbot"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0071e3] flex items-center justify-center text-white shadow-md shadow-[#0071e3]/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white apple-headline">DigAI Copilot</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RAG Active
              </span>
            </div>
            <p className="text-[11px] text-white/50 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>AES-256 Privacy Shield</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSecurityModal}
            title="Configure Encrypted API Key"
            className="apple-press p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Security settings"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="apple-press p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="apple-press p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preloaded Context Story Pill (if user tapped Ask AI on a specific card) */}
      {preloadedContextItem && (
        <div className="p-2.5 mx-3 mt-3 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#0071e3] flex-shrink-0" />
            <span className="text-xs text-white/90 truncate font-medium">
              Focused on: {preloadedContextItem.title}
            </span>
          </div>
          <button
            onClick={onClearPreloadedContext}
            className="text-white/40 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/80 flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#0071e3]" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0071e3] text-white shadow-md rounded-tr-xs'
                    : 'bg-white/[0.05] border border-white/10 text-white/90 rounded-tl-xs backdrop-blur-md'
                }`}
              >
                {/* Message Body */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citations list if present */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#0071e3]" />
                      <span>Retrieved Intel Sources ({msg.citations.length}):</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {msg.citations.map((c) => {
                        const targetItem = feedItems.find((f) => f.id === c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (targetItem) {
                                soundFx.playTap();
                                onSelectFeedItem(targetItem);
                              }
                            }}
                            className="apple-press flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/80 cursor-pointer transition-all"
                          >
                            <span className="truncate">{c.title}</span>
                            <ExternalLink className="w-3 h-3 text-white/40 flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-1.5 text-[10px] text-white/40 text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-[#0071e3]/30 border border-[#0071e3]/50 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-[#0071e3]">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-ping" />
              <span>Retrieving relevant AI cards & reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 border-t border-white/5 bg-white/[0.01]">
        <div className="text-[10px] font-mono text-white/40 uppercase mb-2 px-1">
          Suggested Queries
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="apple-press text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 whitespace-nowrap transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-white/10 bg-[#09090b]/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about AI news, courses, tools..."
            className="w-full pl-4 pr-12 py-3 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-[#0071e3] rounded-2xl text-xs sm:text-sm text-white placeholder-white/40 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={`apple-press absolute right-2 p-2 rounded-xl text-white transition-all ${
              inputValue.trim() && !isLoading
                ? 'bg-[#0071e3] hover:bg-[#0077ed] shadow-md shadow-[#0071e3]/30'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-white/40 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Zero prompt retention · Encrypted locally</span>
          </span>
          <button
            onClick={onOpenSecurityModal}
            className="underline hover:text-white transition-colors"
          >
            {hasCustomKey ? 'Key Active' : 'Provide API Key'}
          </button>
        </div>
      </div>
    </aside>
  );
};
