import React, { useEffect, useRef } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  RefreshCcw, 
  SlidersHorizontal,
  ArrowDown
} from 'lucide-react';
import { FeedItem } from '../types';
import { FeedCard } from './FeedCard';
import { soundFx } from '../utils/audio';

interface FeedViewerProps {
  items: FeedItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
  onAskAi: (item: FeedItem) => void;
  onOpenDeepDive: (item: FeedItem) => void;
  displayMode: 'inshorts' | 'compact';
  newItemsCount: number;
  onLoadNewItems: () => void;
  onResetFilters: () => void;
}

export const FeedViewer: React.FC<FeedViewerProps> = ({
  items,
  currentIndex,
  onNavigate,
  bookmarkedIds,
  onToggleBookmark,
  onAskAi,
  onOpenDeepDive,
  displayMode,
  newItemsCount,
  onLoadNewItems,
  onResetFilters,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for Inshorts mode (Up/Down or J/K)
  useEffect(() => {
    if (displayMode !== 'inshorts') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          soundFx.playTap();
          onNavigate(currentIndex + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (currentIndex > 0) {
          soundFx.playTap();
          onNavigate(currentIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, displayMode, onNavigate]);

  // Handle empty search / filter state
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
          <SlidersHorizontal className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 apple-headline">No matching AI intelligence found</h3>
        <p className="text-sm text-white/60 max-w-md mb-6">
          Try clearing your search query or switching categories to explore the latest model breakthroughs and free courses.
        </p>
        <button
          onClick={onResetFilters}
          className="apple-press px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all shadow-lg"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  // Floating notification when new items arrive via automated updates
  const newUpdatesBanner = newItemsCount > 0 && (
    <div className="sticky top-20 z-30 flex justify-center mb-4">
      <button
        onClick={() => {
          soundFx.playNotification();
          onLoadNewItems();
        }}
        className="apple-press inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#0071e3] to-[#42a5f5] text-white text-xs font-bold shadow-xl shadow-[#0071e3]/30 border border-white/20 animate-bounce"
      >
        <Sparkles className="w-4 h-4" />
        <span>{newItemsCount} New AI Stories Arrived · Click to View</span>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Compact Grid Mode
  if (displayMode === 'compact') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        {newUpdatesBanner}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, idx) => (
            <FeedCard
              key={item.id}
              item={item}
              index={idx}
              total={items.length}
              isBookmarked={bookmarkedIds.has(item.id)}
              onToggleBookmark={onToggleBookmark}
              onAskAi={onAskAi}
              onOpenDeepDive={onOpenDeepDive}
            />
          ))}
        </div>
      </div>
    );
  }

  // Signature Inshorts 1-by-1 Focus View
  const currentItem = items[currentIndex] || items[0];

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto px-4 py-4 sm:py-8 flex flex-col items-center">
      {newUpdatesBanner}

      {/* Progress pill indicator */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-1.5 text-xs text-white/50 font-mono">
          <span>STORY</span>
          <span className="text-white font-bold">{currentIndex + 1}</span>
          <span>OF</span>
          <span>{items.length}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/40">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↑ / K</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↓ / J</kbd>
          <span>to navigate</span>
        </div>
      </div>

      {/* Progress bar line */}
      <div className="w-full max-w-2xl h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0071e3] to-[#42a5f5] transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* The Active Focused Inshorts Card */}
      <div className="w-full transition-all duration-200">
        <FeedCard
          item={currentItem}
          index={currentIndex}
          total={items.length}
          isBookmarked={bookmarkedIds.has(currentItem.id)}
          onToggleBookmark={onToggleBookmark}
          onAskAi={onAskAi}
          onOpenDeepDive={onOpenDeepDive}
        />
      </div>

      {/* Bottom Floating Apple Navigation Controls */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            if (currentIndex > 0) {
              soundFx.playTap();
              onNavigate(currentIndex - 1);
            }
          }}
          disabled={currentIndex === 0}
          className={`apple-press p-3 rounded-full border flex items-center justify-center transition-all ${
            currentIndex === 0
              ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/5 text-white/30'
              : 'border-white/15 bg-white/10 hover:bg-white/15 text-white shadow-lg'
          }`}
          aria-label="Previous story"
          title="Previous story (ArrowUp or K)"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        <span className="text-xs font-mono text-white/60">
          {currentIndex + 1} / {items.length}
        </span>

        <button
          onClick={() => {
            if (currentIndex < items.length - 1) {
              soundFx.playTap();
              onNavigate(currentIndex + 1);
            }
          }}
          disabled={currentIndex === items.length - 1}
          className={`apple-press p-3 rounded-full border flex items-center justify-center transition-all ${
            currentIndex === items.length - 1
              ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/5 text-white/30'
              : 'border-[#0071e3]/40 bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xl shadow-[#0071e3]/30'
          }`}
          aria-label="Next story"
          title="Next story (ArrowDown or J)"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
