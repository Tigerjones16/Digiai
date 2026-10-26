import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Bookmark, 
  Share2, 
  Award, 
  Clock, 
  Check,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { NewsItem, isValidHttpUrl } from '../server/rssService';
import { speechEngine } from '../utils/speech';
import { soundFx } from '../utils/audio';
import { calculateReadingTime } from '../utils/readingTime';

interface DeepStoryModalProps {
  item: NewsItem | null;
  onClose: () => void;
  isBookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onAskAi: (item: NewsItem) => void;
}

export const DeepStoryModal: React.FC<DeepStoryModalProps> = ({
  item,
  onClose,
  isBookmarked,
  isRead,
  onToggleBookmark,
  onToggleRead,
  onAskAi,
}) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const safeUrl = isValidHttpUrl(item.sourceUrl) ? item.sourceUrl : '#';

  const handleShare = async () => {
    soundFx.playTap();
    const text = `DigAI: ${item.title}\n\n${item.summary}\n\nSource: ${safeUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.summary,
          url: safeUrl !== '#' ? safeUrl : undefined,
        });
        return;
      } catch {
        // Fallback
      }
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleListen = () => {
    soundFx.playTap();
    speechEngine.speak(item.id, item.title, item.summary, {
      onEnd: () => onToggleRead(item.id),
    });
  };

  // Honesty 16: Check if real deep data exists
  const hasRealTakeaways = Array.isArray(item.keyTakeaways) && item.keyTakeaways.length > 0;
  const hasRealFullStory = Boolean(item.fullStory && item.fullStory !== item.summary);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deep-story-title"
    >
      <div className="w-full max-w-2xl max-h-[88vh] rounded-3xl bg-[#0f0f13] border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#0071e3] font-bold">
              Article Details
            </span>
            <span className="text-white/40">·</span>
            <span className="text-xs text-white/50 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>{item.readTime || calculateReadingTime(item.title, item.summary, item.fullStory)}</span>
            </span>
            {isRead && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Read</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleListen}
              className="min-h-[36px] px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              aria-label="Listen to narration"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Listen</span>
            </button>

            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
          <h2 id="deep-story-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
            {item.title}
          </h2>

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white/90 leading-relaxed italic">
            "{item.summary}"
          </div>

          {/* Extended Full Story Body (shown only when real data exists) */}
          {hasRealFullStory && (
            <div className="space-y-4 text-sm sm:text-base text-white/80 leading-relaxed">
              <p>{item.fullStory}</p>
            </div>
          )}

          {/* Key Takeaways (shown only when real data exists) */}
          {hasRealTakeaways && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Key Intelligence Takeaways</span>
              </h3>
              <ul className="space-y-2.5">
                {item.keyTakeaways!.map((t, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-white/80 flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#0071e3] mt-1.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prominent link to read original source */}
          <div className="p-4 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white">Full Publication Available</p>
              <p className="text-[11px] text-white/60">Read complete unedited report at {item.sourceName}</p>
            </div>
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Read Full Article</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Course Details */}
          {item.courseDetails && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Award className="w-4 h-4" />
                <span>{item.courseDetails.provider} Verified Curriculum</span>
              </div>
              <div className="text-xs text-white/80">
                <strong>Instructor:</strong> {item.courseDetails.instructor || 'Course Staff'}
              </div>
              <div className="text-xs text-emerald-300">
                {item.courseDetails.freeCertificate ? '✅ Free Certificate of Completion' : 'ℹ️ Free Full Audit Curriculum'}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all"
            aria-label={`Visit source: ${item.sourceName}`}
          >
            <span>Visit Source ({item.sourceName})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playTap();
                onAskAi(item);
                onClose();
              }}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#0071e3] text-white text-xs font-semibold shadow-lg shadow-[#0071e3]/30 hover:bg-[#0077ed] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI About This</span>
            </button>

            <button
              onClick={() => {
                soundFx.playTap();
                onToggleBookmark(item.id);
              }}
              className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-all ${
                isBookmarked ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-white/70 border-white/10'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
              aria-label="Bookmark"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-300' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 flex items-center justify-center transition-all"
              title="Share story"
              aria-label="Share"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
