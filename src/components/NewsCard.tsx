import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  Bookmark, 
  Share2, 
  Check, 
  Award, 
  Clock, 
  MessageSquare,
  GraduationCap,
  Wrench,
  Newspaper,
  BookOpen,
  Volume2,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { NewsItem, isValidHttpUrl } from '../server/rssService';
import { speechEngine } from '../utils/speech';
import { soundFx } from '../utils/audio';
import { calculateReadingTime } from '../utils/readingTime';

interface NewsCardProps {
  item: NewsItem;
  isBookmarked: boolean;
  isRead: boolean;
  fontSize: 'compact' | 'normal' | 'large';
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onMarkRead: (id: string) => void;
  onAskAboutStory: (item: NewsItem) => void;
  onOpenDeepStory: (item: NewsItem) => void;
  onSelectTag: (tag: string) => void;
  index: number;
  total: number;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  item,
  isBookmarked,
  isRead,
  fontSize,
  onToggleBookmark,
  onToggleRead,
  onMarkRead,
  onAskAboutStory,
  onOpenDeepStory,
  onSelectTag,
  index,
  total,
}) => {
  const [copied, setCopied] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'playing' | 'paused'>('idle');

  // Monitor Speech status
  useEffect(() => {
    const unsubscribe = speechEngine.subscribe((status) => {
      if (speechEngine.getCurrentTextId() === item.id) {
        setSpeechStatus(status);
      } else {
        setSpeechStatus('idle');
      }
    });
    return unsubscribe;
  }, [item.id]);

  const handleToggleListen = () => {
    soundFx.playTap();
    if (speechStatus === 'playing') {
      speechEngine.pause();
    } else if (speechStatus === 'paused') {
      speechEngine.resume();
    } else {
      speechEngine.speak(item.id, item.title, item.summary, {
        // Bug 4: When audio narration ends, call onMarkRead(id) that only sets read = true (never toggles)
        onEnd: () => {
          onMarkRead(item.id);
        },
      });
    }
  };

  const handleShare = async () => {
    soundFx.playTap();
    const safeUrl = isValidHttpUrl(item.sourceUrl) ? item.sourceUrl : '';
    const text = `DigAI: ${item.title}\n\n${item.summary}\n\nRead more at ${safeUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary,
          url: safeUrl || undefined,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = () => {
    switch (item.category) {
      case 'course':
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Free Course',
          cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        };
      case 'tool':
        return {
          icon: <Wrench className="w-3.5 h-3.5 text-blue-400" />,
          label: 'Tool Update',
          cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
        };
      case 'research':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Research',
          cls: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
        };
      default:
        return {
          icon: <Newspaper className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'AI News',
          cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
        };
    }
  };

  const badge = getCategoryBadge();

  // Typography sizing based on user preference
  const summarySizeClass =
    fontSize === 'compact'
      ? 'text-xs sm:text-sm leading-normal'
      : fontSize === 'large'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-sm sm:text-base leading-relaxed';

  const titleSizeClass =
    fontSize === 'compact'
      ? 'text-base sm:text-lg font-bold'
      : fontSize === 'large'
      ? 'text-xl sm:text-2xl font-extrabold'
      : 'text-lg sm:text-xl font-bold';

  // Security 6: Re-check URLs before rendering href
  const safeSourceUrl = isValidHttpUrl(item.sourceUrl) ? item.sourceUrl : '#';
  const safeEnrollUrl =
    item.courseDetails && isValidHttpUrl(item.courseDetails.enrollUrl)
      ? item.courseDetails.enrollUrl
      : '#';

  // Honesty 16: Check if real deep story data exists
  const hasDeepStory = Boolean(
    (item.keyTakeaways && item.keyTakeaways.length > 0) || item.fullStory || item.courseDetails
  );

  return (
    <article 
      className={`w-full max-w-2xl mx-auto rounded-3xl bg-[#0f0f13] border p-5 sm:p-7 shadow-2xl flex flex-col justify-between transition-all duration-200 ${
        isRead ? 'border-white/10 opacity-95' : 'border-white/20'
      }`}
      aria-labelledby={`card-title-${item.id}`}
    >
      <div>
        {/* Top Meta Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </span>

            {item.isHot && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 animate-pulse">
                HOT
              </span>
            )}

            {isRead && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Read</span>
              </span>
            )}

            {/* Estimated Reading Time Display */}
            <span 
              className="text-xs text-cyan-300/90 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono tracking-tight"
              title="Estimated reading time"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{item.readTime || calculateReadingTime(item.title, item.summary, item.fullStory)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Listen Narration Button */}
            <button
              onClick={handleToggleListen}
              className={`min-h-[38px] px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                speechStatus === 'playing'
                  ? 'bg-[#0071e3] text-white shadow-md shadow-[#0071e3]/40 animate-pulse'
                  : speechStatus === 'paused'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              }`}
              aria-label={speechStatus === 'playing' ? 'Pause audio narration' : 'Listen to story'}
              title={speechStatus === 'playing' ? 'Pause Narration' : 'Listen with Audio Narration'}
            >
              {speechStatus === 'playing' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  <span>Listening...</span>
                </>
              ) : speechStatus === 'paused' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </>
              )}
            </button>

            {/* Deep Story Drawer Opener (Show only when real deep data exists) */}
            {hasDeepStory && (
              <button
                onClick={() => onOpenDeepStory(item)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                aria-label="Open deep story takeaways and analysis"
                title="Dig Deeper (Takeaways & Details)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title (Rendered directly as plain text without DOMPurify - React auto-escapes safely) */}
        <h2 
          id={`card-title-${item.id}`}
          className={`${titleSizeClass} text-white tracking-tight leading-snug mb-3 hover:text-white/95 cursor-pointer`}
          onClick={() => {
            if (hasDeepStory) onOpenDeepStory(item);
          }}
        >
          {item.title}
        </h2>

        {/* Summary (Rendered directly as plain text without DOMPurify) */}
        <p className={`${summarySizeClass} text-white/80 mb-4`}>
          {item.summary}
        </p>

        {/* Free Course Special Card */}
        {item.courseDetails && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
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
                Level: {item.courseDetails.difficulty}
              </div>
            </div>

            <a
              href={safeEnrollUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              aria-label={`Enroll in free course: ${item.title}`}
            >
              <span>Enroll Free</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {item.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label={`Filter stories by tag #${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer & Action Bar (Minimum 44px touch targets) */}
      <footer className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <a
          href={safeSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] text-xs font-semibold text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors group"
          aria-label={`Visit original article on ${item.sourceName}`}
        >
          <span>Source: {item.sourceName}</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
        </a>

        <div className="flex items-center gap-1.5">
          {/* Mark Read Toggle (Toggles state when clicked by user) */}
          <button
            onClick={() => {
              soundFx.playTap();
              onToggleRead(item.id);
            }}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              isRead 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'
            }`}
            aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
            title={isRead ? 'Story Completed' : 'Mark Story Read'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRead ? 'Done' : 'Mark Read'}</span>
          </button>

          {/* Ask AI Contextual Question */}
          <button
            onClick={() => {
              soundFx.playTap();
              onAskAboutStory(item);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0071e3]/15 hover:bg-[#0071e3]/25 text-[#0071e3] hover:text-[#42a5f5] border border-[#0071e3]/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
            aria-label={`Ask AI Assistant about: ${item.title}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => {
              soundFx.playTap();
              onToggleBookmark(item.id);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-all ${
              isBookmarked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
            }`}
            aria-label={isBookmarked ? 'Remove from saved' : 'Save article'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
            aria-label="Share article summary"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </footer>
    </article>
  );
};
