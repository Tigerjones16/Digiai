import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  AlertCircle, 
  RotateCw,
  Search,
  SlidersHorizontal,
  Bookmark,
  X,
  Volume2,
  Flame,
  CheckCircle2
} from 'lucide-react';

import { NewsItem } from './server/rssService';
import { Header } from './components/Header';
import { NewsCard } from './components/NewsCard';
import { DeepStoryModal } from './components/DeepStoryModal';
import { ChatAssistant } from './components/ChatAssistant';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { usePWA } from './hooks/usePWA';
import { soundFx } from './utils/audio';
import { User } from 'firebase/auth';
import { GoogleFormsModal } from './components/GoogleFormsModal';
import { 
  initAuth, 
  db, 
  handleFirestoreError, 
  OperationType, 
  setAccessTokenInMemory 
} from './services/firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

const STORAGE_KEYS = {
  BOOKMARKS: 'digai_bookmarks_v2',
  READ_TODAY: 'digai_read_today_ids',
  READ_DATE: 'digai_read_date',
  STREAK_COUNT: 'digai_streak_count',
  LAST_STREAK_DATE: 'digai_last_streak_date',
  FONT_SIZE: 'digai_font_size',
};

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const pwaState = usePWA();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newUpdateAlert, setNewUpdateAlert] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [preloadedContextItem, setPreloadedContextItem] = useState<NewsItem | null>(null);
  const [deepStoryItem, setDeepStoryItem] = useState<NewsItem | null>(null);

  // Firebase Auth & Google Workspace state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFormsOpen, setIsFormsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessTokenInMemory(token);
        // Sync remote bookmarks from Firestore
        (async () => {
          try {
            const snap = await getDocs(collection(db, 'users', user.uid, 'bookmarks'));
            if (!snap.empty) {
              const remoteIds = new Set<string>();
              snap.forEach((d) => remoteIds.add(d.id));
              setBookmarkedIds((prev) => new Set([...prev, ...remoteIds]));
            }
          } catch (e) {
            console.warn('Could not sync remote bookmarks:', e);
          }
        })();
      },
      () => {
        setCurrentUser(null);
        setAccessTokenInMemory(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Font size setting (compact, normal, large)
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (saved === 'compact' || saved === 'normal' || saved === 'large') return saved;
    } catch {}
    return 'normal';
  });

  // Bookmarks state
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Daily Reading Tracker State
  const [readTodayIds, setReadTodayIds] = useState<Set<string>>(() => {
    try {
      const today = getTodayString();
      const savedDate = localStorage.getItem(STORAGE_KEYS.READ_DATE);
      if (savedDate === today) {
        const saved = localStorage.getItem(STORAGE_KEYS.READ_TODAY);
        return saved ? new Set(JSON.parse(saved)) : new Set();
      }
    } catch {}
    return new Set();
  });

  // Daily Streak State
  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    try {
      const today = getTodayString();
      const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_STREAK_DATE);
      const savedStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK_COUNT) || '1', 10);

      if (!lastDate) {
        localStorage.setItem(STORAGE_KEYS.LAST_STREAK_DATE, today);
        localStorage.setItem(STORAGE_KEYS.STREAK_COUNT, '1');
        return 1;
      }

      if (lastDate === today) {
        return savedStreak;
      }

      // Check if last date was yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      if (lastDate === yesterdayStr) {
        const newStreak = savedStreak + 1;
        localStorage.setItem(STORAGE_KEYS.LAST_STREAK_DATE, today);
        localStorage.setItem(STORAGE_KEYS.STREAK_COUNT, String(newStreak));
        return newStreak;
      } else {
        // Streak broken
        localStorage.setItem(STORAGE_KEYS.LAST_STREAK_DATE, today);
        localStorage.setItem(STORAGE_KEYS.STREAK_COUNT, '1');
        return 1;
      }
    } catch {
      return 1;
    }
  });

  // Touch Swipe Handling Refs
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Fetch News Feed from Server
  const fetchNews = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/news');
      if (!res.ok) {
        throw new Error('Unable to reach server news service');
      }
      const data = await res.json();
      setItems(data.items || []);
      setNewUpdateAlert(false);
    } catch (err: any) {
      console.warn('News fetch error:', err);
      setError('Could not connect to news feed. Please check connection and retry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(false);
  }, []);

  // Background automated feed poller (every 4 minutes)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > items.length) {
            setNewUpdateAlert(true);
          }
        }
      } catch {}
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [items.length]);

  // Persist Bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(Array.from(bookmarkedIds)));
    } catch {}
  }, [bookmarkedIds]);

  // Persist Read Today
  useEffect(() => {
    try {
      const today = getTodayString();
      localStorage.setItem(STORAGE_KEYS.READ_DATE, today);
      localStorage.setItem(STORAGE_KEYS.READ_TODAY, JSON.stringify(Array.from(readTodayIds)));
    } catch {}
  }, [readTodayIds]);

  // Persist Font Size
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
    } catch {}
  }, [fontSize]);

  const handleToggleBookmark = async (id: string) => {
    const isSaved = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(id);
      else next.add(id);
      return next;
    });

    if (currentUser) {
      const targetItem = items.find((i) => i.id === id);
      const path = `users/${currentUser.uid}/bookmarks/${id}`;
      try {
        if (!isSaved && targetItem) {
          await setDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id), {
            id,
            userId: currentUser.uid,
            articleId: id,
            title: targetItem.title.slice(0, 300),
            sourceUrl: targetItem.sourceUrl.slice(0, 500),
            category: targetItem.category.slice(0, 50),
            createdAt: new Date().toISOString(),
          });
        } else if (isSaved) {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'bookmarks', id));
        }
      } catch (err: any) {
        handleFirestoreError(err, isSaved ? OperationType.DELETE : OperationType.WRITE, path);
      }
    }
  };

  const handleToggleRead = (id: string) => {
    setReadTodayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCycleFontSize = () => {
    setFontSize((prev) => {
      if (prev === 'compact') return 'normal';
      if (prev === 'normal') return 'large';
      return 'compact';
    });
  };

  const handleAskAboutStory = (item: NewsItem) => {
    setPreloadedContextItem(item);
    setIsChatOpen(true);
  };

  // Keyboard Navigation for card feed (Up/Down or J/K or Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isChatOpen || deepStoryItem) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        soundFx.playTap();
        setCurrentIndex((prev) => Math.min(prev + 1, Math.max(0, filteredItems.length - 1)));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        soundFx.playTap();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Filtered Items
  const filteredItems = useMemo(() => {
    let result = items;

    if (activeCategory === 'bookmarks') {
      result = result.filter((i) => bookmarkedIds.has(i.id));
    } else if (activeCategory !== 'all') {
      result = result.filter((i) => i.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.sourceName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, activeCategory, searchQuery, bookmarkedIds]);

  // Reset index on category change
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory, searchQuery]);

  const currentItem = filteredItems[currentIndex] || filteredItems[0];

  // Auto-mark card as read after viewing for 4 seconds
  useEffect(() => {
    if (!currentItem) return;
    const timer = setTimeout(() => {
      setReadTodayIds((prev) => {
        if (!prev.has(currentItem.id)) {
          const next = new Set(prev);
          next.add(currentItem.id);
          return next;
        }
        return prev;
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentItem?.id]);

  // Mobile Touch Swipe Handlers (Swipe Up -> Next, Swipe Down -> Prev)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;

    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;

    // Primarily vertical swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 48) {
      if (deltaY > 0) {
        // Swiped UP -> Go to NEXT card
        if (currentIndex < filteredItems.length - 1) {
          soundFx.playTap();
          setCurrentIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
        }
      } else {
        // Swiped DOWN -> Go to PREVIOUS card
        if (currentIndex > 0) {
          soundFx.playTap();
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      }
    }

    touchStartY.current = null;
    touchStartX.current = null;
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#f5f5f7] flex flex-col font-sans antialiased selection:bg-[#0071e3] selection:text-white">
      {/* Offline Status Banner */}
      <OfflineBanner isOnline={pwaState.isOnline} />

      {/* Main Header with Everyday Controls */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onRefresh={() => fetchNews(true)}
        isRefreshing={isRefreshing}
        bookmarkedCount={bookmarkedIds.size}
        readCount={readTodayIds.size}
        totalCount={items.length}
        dailyStreak={dailyStreak}
        fontSize={fontSize}
        onCycleFontSize={handleCycleFontSize}
        pwaState={pwaState}
        onOpenForms={() => setIsFormsOpen(true)}
        currentUser={currentUser}
      />

      {/* New Updates Floating Toast */}
      {newUpdateAlert && (
        <div className="sticky top-28 z-30 mx-auto max-w-sm px-4">
          <button
            onClick={() => fetchNews(true)}
            className="w-full py-2 px-4 rounded-full bg-[#0071e3] text-white text-xs font-semibold shadow-lg shadow-[#0071e3]/40 flex items-center justify-center gap-2 hover:bg-[#0077ed] transition-all animate-bounce"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fresh AI stories updated • Tap to refresh</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main 
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col items-center justify-start select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Active Filter Pill */}
        {searchQuery.trim() && (
          <div className="w-full max-w-2xl mb-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white">
            <span className="truncate">
              Filtering by: <strong className="text-cyan-400 font-mono">"{searchQuery}"</strong>
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white"
              aria-label="Clear active filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* State 1: Loading State */}
        {loading && (
          <div 
            role="status" 
            aria-live="polite"
            className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[#0071e3]">
              <RotateCw className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">Loading AI Intelligence...</h2>
            <p className="text-xs text-white/50">Aggregating fresh feeds and verified courses</p>
          </div>
        )}

        {/* State 2: Error State */}
        {!loading && error && (
          <div 
            role="alert" 
            className="w-full max-w-lg mx-auto min-h-[50vh] flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 my-auto"
          >
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <h2 className="text-base font-bold text-white mb-1">Feed Retrieval Error</h2>
            <p className="text-xs text-rose-200/80 mb-5">{error}</p>
            <button
              onClick={() => fetchNews(true)}
              className="min-h-[44px] px-5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all shadow-md flex items-center gap-2"
              aria-label="Retry loading news feed"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Now</span>
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <div 
            role="status"
            className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8 my-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/40">
              <SlidersHorizontal className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">No items found</h2>
            <p className="text-xs text-white/50 max-w-xs mb-5">
              {searchQuery ? `No articles matching "${searchQuery}".` : 'No saved stories or items in this section.'}
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="min-h-[44px] px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
              aria-label="Reset all search filters"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* State 4: Active Card Feed */}
        {!loading && !error && filteredItems.length > 0 && currentItem && (
          <div className="w-full flex flex-col items-center">
            {/* Progress Bar & Flip Tips */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-3 px-1">
              <div className="text-xs font-mono text-white/50 flex items-center gap-1.5">
                <span>CARD</span>
                <span className="text-white font-bold">{currentIndex + 1}</span>
                <span>OF</span>
                <span>{filteredItems.length}</span>
                {readTodayIds.has(currentItem.id) && (
                  <span className="ml-2 text-emerald-400 font-sans text-[11px] flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completed</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <span className="hidden sm:inline">Swipe or use</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">↑/↓</kbd>
                <span className="sm:hidden text-[10px] text-white/40">Swipe up/down</span>
              </div>
            </div>

            {/* Active News Card */}
            <NewsCard
              item={currentItem}
              index={currentIndex}
              total={filteredItems.length}
              isBookmarked={bookmarkedIds.has(currentItem.id)}
              isRead={readTodayIds.has(currentItem.id)}
              fontSize={fontSize}
              onToggleBookmark={handleToggleBookmark}
              onToggleRead={handleToggleRead}
              onMarkRead={(id) => setReadTodayIds((prev) => new Set([...prev, id]))}
              onAskAboutStory={handleAskAboutStory}
              onOpenDeepStory={(item) => setDeepStoryItem(item)}
              onSelectTag={(tag) => setSearchQuery(tag)}
            />

            {/* Navigation Chevrons (Min 44px touch targets) */}
            <nav className="mt-5 flex items-center justify-center gap-4" aria-label="Story navigation">
              <button
                onClick={() => {
                  soundFx.playTap();
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
                className="min-h-[44px] min-w-[44px] rounded-full border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md active:scale-95"
                aria-label="Previous story"
                title="Previous story (Swipe Down or ↑)"
              >
                <ChevronUp className="w-5 h-5" />
              </button>

              <span className="text-xs font-mono text-white/50">
                {currentIndex + 1} / {filteredItems.length}
              </span>

              <button
                onClick={() => {
                  soundFx.playTap();
                  setCurrentIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
                }}
                disabled={currentIndex === filteredItems.length - 1}
                className="min-h-[44px] min-w-[44px] rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-lg shadow-[#0071e3]/30 active:scale-95"
                aria-label="Next story"
                title="Next story (Swipe Up or ↓)"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </nav>
          </div>
        )}
      </main>

      {/* Deep Story Modal (Takeaways & Full Details) */}
      <DeepStoryModal
        item={deepStoryItem}
        onClose={() => setDeepStoryItem(null)}
        isBookmarked={deepStoryItem ? bookmarkedIds.has(deepStoryItem.id) : false}
        isRead={deepStoryItem ? readTodayIds.has(deepStoryItem.id) : false}
        onToggleBookmark={handleToggleBookmark}
        onToggleRead={handleToggleRead}
        onAskAi={handleAskAboutStory}
      />

      {/* In-App PWA Install Banner */}
      <InstallPrompt pwaState={pwaState} />

      {/* Side Chat Assistant */}
      <ChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        preloadedContextItem={preloadedContextItem}
        onClearPreloadedContext={() => setPreloadedContextItem(null)}
      />

      {/* Google Forms Workspace Manager Modal */}
      <GoogleFormsModal
        isOpen={isFormsOpen}
        onClose={() => setIsFormsOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessTokenInMemory(token);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setAccessTokenInMemory(null);
        }}
      />
    </div>
  );
}
