import React from 'react';
import { 
  Sparkles, 
  Search, 
  Bell, 
  BellOff, 
  MessageSquare, 
  RotateCw, 
  Download,
  GraduationCap,
  Wrench,
  Newspaper,
  BookOpen,
  Layers,
  Bookmark,
  Flame,
  CheckCircle2,
  Type
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FileText } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  bookmarkedCount: number;
  readCount: number;
  totalCount: number;
  dailyStreak: number;
  fontSize: 'compact' | 'normal' | 'large';
  onCycleFontSize: () => void;
  pwaState: ReturnType<typeof usePWA>;
  onOpenForms: () => void;
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onToggleChat,
  isChatOpen,
  onRefresh,
  isRefreshing,
  bookmarkedCount,
  readCount,
  totalCount,
  dailyStreak,
  fontSize,
  onCycleFontSize,
  pwaState,
  onOpenForms,
  currentUser,
}) => {
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, pushLoading, isInstallable, triggerInstall } = pwaState;

  const categories = [
    { id: 'all', label: 'All Intel', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'news', label: 'AI News', icon: <Newspaper className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'course', label: 'Free Courses', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'tool', label: 'Tools', icon: <Wrench className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'research', label: 'Research', icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  const handlePushClick = () => {
    soundFx.playTap();
    if (isSubscribed) {
      unsubscribeFromPush();
    } else {
      subscribeToPush();
    }
  };

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'compact':
        return 'A-';
      case 'large':
        return 'A+';
      default:
        return 'A';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#09090c]/95 border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand & Streak Indicator */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              soundFx.playTap();
              onSelectCategory('all');
            }}
            className="flex items-center gap-2 min-h-[44px] text-left"
            aria-label="DigAI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#42a5f5] flex items-center justify-center text-white shadow-lg shadow-[#0071e3]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">DigAI</span>
              <span className="text-[10px] text-white/50 font-mono">Daily AI Briefing</span>
            </div>
          </button>

          {/* Daily Streak Badge */}
          {dailyStreak > 0 && (
            <div 
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold"
              title={`${dailyStreak}-day reading streak! Keep coming back every day.`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span>{dailyStreak}d Streak</span>
            </div>
          )}

          {/* Today's Reading Progress Meter */}
          {totalCount > 0 && (
            <div 
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-mono"
              title={`${readCount} of ${totalCount} articles completed today.`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${readCount === totalCount ? 'text-emerald-400' : 'text-white/40'}`} />
              <span>{readCount}/{totalCount} Read</span>
            </div>
          )}
        </div>

        {/* Center Search (Accessible on md+ screens) */}
        <div className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <label htmlFor="search-feed" className="sr-only">Search AI news and free courses</label>
            <input
              id="search-feed"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter topics, tools, papers..."
              className="w-full min-h-[40px] pl-9 pr-4 bg-white/5 border border-white/10 rounded-full text-xs text-white placeholder-white/40 outline-none focus:border-[#0071e3]"
            />
          </div>
        </div>

        {/* Action Controls (min 44px touch targets) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size Adjuster Button */}
          <button
            onClick={() => {
              soundFx.playTap();
              onCycleFontSize();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold transition-all"
            aria-label={`Cycle font size (Currently ${fontSize})`}
            title={`Reading Text Size: ${fontSize} (Tap to change)`}
          >
            <span>{getFontSizeLabel()}</span>
          </button>

          {/* Refresh RSS Feed */}
          <button
            onClick={() => {
              soundFx.playTap();
              onRefresh();
            }}
            disabled={isRefreshing}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            aria-label="Refresh news feed"
            title="Refresh news feed"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0071e3]' : ''}`} />
          </button>

          {/* Web Push Subscription Toggle (Rule 15) */}
          <button
            onClick={handlePushClick}
            disabled={pushLoading}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSubscribed
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            aria-label={isSubscribed ? 'Unsubscribe from 7:00 AM daily push alerts' : 'Subscribe to 7:00 AM daily push alerts'}
            title={isSubscribed ? 'Subscribed to 7:00 AM Daily Push (Click to Unsubscribe)' : 'Subscribe to 7:00 AM Daily Push Notifications'}
          >
            {isSubscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSubscribed ? '7 AM Alerts' : 'Get Alerts'}</span>
          </button>

          {/* In-app PWA install trigger if installable */}
          {isInstallable && (
            <button
              onClick={() => {
                soundFx.playTap();
                triggerInstall();
              }}
              className="min-h-[44px] px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              aria-label="Install DigAI progressive web app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Google Forms Integration (Workspace) */}
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenForms();
            }}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentUser
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            aria-label="Manage Google Forms Surveys & Quizzes"
            title="Google Forms Workspace: Create AI surveys, comprehension polls & inspect responses"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Forms</span>
            {currentUser && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          {/* AI Chat Assistant toggle */}
          <button
            onClick={() => {
              soundFx.playTap();
              onToggleChat();
            }}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isChatOpen
                ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/30'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
            }`}
            aria-label="Toggle AI News Assistant"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <nav 
        className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between overflow-x-auto no-scrollbar gap-2 border-t border-white/5"
        aria-label="News categories"
      >
        <div className="flex items-center gap-1.5">
          {categories.map((c) => {
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  soundFx.playTap();
                  onSelectCategory(c.id);
                }}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
                aria-pressed={isActive}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Saved count */}
        <button
          onClick={() => {
            soundFx.playTap();
            onSelectCategory(activeCategory === 'bookmarks' ? 'all' : 'bookmarks');
          }}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap border transition-all ${
            activeCategory === 'bookmarks'
              ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-md'
              : bookmarkedCount > 0
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-white/5 border-white/5 text-white/50'
          }`}
          aria-label={`View ${bookmarkedCount} saved stories`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{bookmarkedCount} Saved</span>
        </button>
      </nav>
    </header>
  );
};
