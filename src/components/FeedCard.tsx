import React, { useState } from 'react';
import { 
  Bookmark, 
  ExternalLink, 
  MessageSquareShare, 
  Share2, 
  Volume2, 
  VolumeX, 
  Check, 
  GraduationCap, 
  Wrench, 
  Newspaper, 
  BookOpen, 
  Flame, 
  Clock, 
  Award, 
  Github, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { FeedItem } from '../types';
import { soundFx } from '../utils/audio';

interface FeedCardProps {
  item: FeedItem;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onAskAi: (item: FeedItem) => void;
  onOpenDeepDive: (item: FeedItem) => void;
  index: number;
  total: number;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  item,
  isBookmarked,
  onToggleBookmark,
  onAskAi,
  onOpenDeepDive,
  index,
  total,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const getCategoryTheme = (cat: FeedItem['category']) => {
    switch (cat) {
      case 'course':
        return {
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
          icon: <GraduationCap className="w-3.5 h-3.5" />,
          label: 'Free Course',
          accent: '#10b981',
        };
      case 'tool':
        return {
          badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
          icon: <Wrench className="w-3.5 h-3.5" />,
          label: 'Tool Update',
          accent: '#3b82f6',
        };
      case 'research':
        return {
          badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
          icon: <BookOpen className="w-3.5 h-3.5" />,
          label: 'Research Digest',
          accent: '#a855f7',
        };
      default:
        return {
          badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
          icon: <Newspaper className="w-3.5 h-3.5" />,
          label: 'Breaking AI',
          accent: '#06b6d4',
        };
    }
  };

  const theme = getCategoryTheme(item.category);

  const handleShare = () => {
    soundFx.playTap();
    const shareText = `DigAI: ${item.title}\n\n${item.summary}\n\nSource: ${item.sourceUrl}`;
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    soundFx.playTap();
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${item.title}. ${item.summary}`);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleBookmarkToggle = () => {
    soundFx.playSuccess();
    onToggleBookmark(item.id);
  };

  return (
    <article className="w-full max-w-2xl mx-auto rounded-3xl apple-glass p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-white/20 relative overflow-hidden group">
      {/* Background ambient gradient glow */}
      <div 
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none transition-opacity duration-500 group-hover:opacity-25"
        style={{ backgroundColor: theme.accent }}
      />

      {/* Top Meta Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${theme.badge}`}>
              {theme.icon}
              <span>{theme.label}</span>
            </span>

            {/* Hot badge if applicable */}
            {item.isHot && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
                <span>HOT</span>
              </span>
            )}

            {/* Read Time */}
            <span className="inline-flex items-center gap-1 text-xs text-white/50 font-mono">
              <Clock className="w-3 h-3" />
              <span>{item.readTime}</span>
            </span>
          </div>

          {/* Index Counter (Inshorts style) */}
          <span className="text-xs font-mono text-white/40 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
            {index + 1} / {total}
          </span>
        </div>

        {/* Title (Apple headline with -0.02em tracking) */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-[-0.02em] leading-snug mb-3">
          {item.title}
        </h2>

        {/* Crisp 60-word Digest (Inshorts core experience) */}
        <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal mb-5">
          {item.summary}
        </p>

        {/* Key Takeaways Section */}
        {item.keyTakeaways && item.keyTakeaways.length > 0 && (
          <div className="mb-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-semibold tracking-wider text-white/40 uppercase mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0071e3]" />
              <span>Key Takeaways</span>
            </div>
            <ul className="space-y-1.5">
              {item.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] mt-1.5 flex-shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dynamic Category Specific Metadata Card */}
        {item.courseDetails && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Award className="w-4 h-4" />
                <span>{item.courseDetails.provider}</span>
                {item.courseDetails.freeCertificate && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400 text-black font-bold">
                    Free Certificate
                  </span>
                )}
              </div>
              <div className="text-[11px] text-emerald-200/70 mt-0.5">
                Difficulty: {item.courseDetails.difficulty} · Prerequisites: {item.courseDetails.prerequisites}
              </div>
            </div>
            <a
              href={item.courseDetails.enrollUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400 text-black text-xs font-semibold hover:bg-emerald-300 transition-all shadow-sm"
            >
              <span>Enroll Free</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {item.toolDetails && (
          <div className="mb-5 p-3.5 rounded-2xl bg-blue-500/[0.07] border border-blue-500/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  {item.toolDetails.pricingModel}
                </span>
                {item.toolDetails.githubStars && (
                  <span className="flex items-center gap-1 text-[11px] text-white/70 font-mono">
                    <Github className="w-3 h-3" />
                    <span>★ {item.toolDetails.githubStars}</span>
                  </span>
                )}
                {item.toolDetails.version && (
                  <span className="text-[11px] text-white/50 font-mono">{item.toolDetails.version}</span>
                )}
              </div>
              <div className="text-[11px] text-blue-200/70 mt-1">
                Feature: {item.toolDetails.topFeature}
              </div>
            </div>
            <a
              href={item.toolDetails.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-semibold hover:bg-blue-400 transition-all shadow-sm"
            >
              <span>Open Tool</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {item.researchDetails && (
          <div className="mb-5 p-3.5 rounded-2xl bg-purple-500/[0.07] border border-purple-500/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-semibold text-purple-300">
                {item.researchDetails.institution}
              </div>
              <div className="text-[11px] text-purple-200/70 mt-0.5">
                Breakthrough: {item.researchDetails.breakthrough}
              </div>
            </div>
            {item.researchDetails.arxivId && (
              <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-purple-500/20 text-purple-300">
                arXiv:{item.researchDetails.arxivId}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer / Action Bar */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
        {/* Source link & Deep dive */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenDeepDive(item);
            }}
            className="apple-press text-xs font-semibold text-white/90 hover:text-white flex items-center gap-1 group/btn"
          >
            <span>Deep Dive</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
          
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
          >
            <span>{item.sourceName}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Interactive Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Audio TTS toggle */}
          <button
            onClick={handleSpeech}
            title={isSpeaking ? 'Stop Audio Readout' : 'Listen to 60s Digest'}
            className={`apple-press p-2 rounded-full border text-xs transition-all ${
              isSpeaking
                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
            }`}
            aria-label="Text to speech audio readout"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Ask AI about this card */}
          <button
            onClick={() => {
              soundFx.playTap();
              onAskAi(item);
            }}
            className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0071e3]/15 hover:bg-[#0071e3]/25 border border-[#0071e3]/30 text-[#0071e3] hover:text-[#42a5f5] text-xs font-semibold transition-all"
            title="Ask AI chatbot about this item"
          >
            <MessageSquareShare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            className={`apple-press p-2 rounded-full border transition-all ${
              isBookmarked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Save Story'}
            aria-label="Bookmark story"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Share / Copy Summary Button */}
          <button
            onClick={handleShare}
            className={`apple-press p-2 rounded-full border transition-all ${
              isCopied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
            }`}
            title="Copy summary & link"
            aria-label="Share summary"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </article>
  );
};
