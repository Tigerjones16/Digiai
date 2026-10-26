import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Volume2, 
  VolumeX, 
  Check, 
  Trash2, 
  Sparkles, 
  GraduationCap, 
  Wrench, 
  Newspaper,
  BookOpen,
  SlidersHorizontal,
  Plus,
  Tag,
  Flame,
  Shield,
  SendHorizontal
} from 'lucide-react';
import { NotificationItem } from '../types';
import { NotificationPreferences } from '../utils/notificationMatcher';
import { soundFx } from '../utils/audio';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSelectNotification: (feedItemId: string) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onEnableBrowserNotifications: () => void;
  preferences: NotificationPreferences;
  onUpdatePreferences: (newPrefs: NotificationPreferences) => void;
  onSendTestNotification: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onSelectNotification,
  soundEnabled,
  onToggleSound,
  onEnableBrowserNotifications,
  preferences,
  onUpdatePreferences,
  onSendTestNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences'>('alerts');
  const [newKeywordInput, setNewKeywordInput] = useState('');

  if (!isOpen) return null;

  const getIcon = (cat: NotificationItem['category']) => {
    switch (cat) {
      case 'course':
        return <GraduationCap className="w-4 h-4 text-emerald-400" />;
      case 'tool':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'news':
        return <Newspaper className="w-4 h-4 text-cyan-400" />;
      case 'research':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#0071e3]" />;
    }
  };

  const handleToggleCategory = (catKey: keyof NotificationPreferences['enabledCategories']) => {
    soundFx.playTap();
    onUpdatePreferences({
      ...preferences,
      enabledCategories: {
        ...preferences.enabledCategories,
        [catKey]: !preferences.enabledCategories[catKey],
      },
    });
  };

  const handleAddKeyword = (kwToAdd?: string) => {
    const word = (kwToAdd || newKeywordInput).trim().toLowerCase();
    if (!word) return;
    if (preferences.keywords.map((k) => k.toLowerCase()).includes(word)) {
      setNewKeywordInput('');
      return;
    }

    soundFx.playTap();
    onUpdatePreferences({
      ...preferences,
      keywords: [...preferences.keywords, word],
    });
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    soundFx.playTap();
    onUpdatePreferences({
      ...preferences,
      keywords: preferences.keywords.filter((k) => k.toLowerCase() !== kwToRemove.toLowerCase()),
    });
  };

  const popularKeywords = [
    'free certificate',
    'claude 3.7',
    'deepseek',
    'agents',
    'open source',
    'reasoning',
    'local llm',
    'pytorch',
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md mt-14 rounded-3xl apple-glass p-5 bg-[#0e0e11]/95 border border-white/15 shadow-2xl flex flex-col max-h-[82vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Personalized Notification Center"
      >
        {/* Header & Segmented Pill Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0071e3]" />
            <h3 className="font-bold text-sm text-white apple-headline">Intelligence Center</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playTap();
                onToggleSound(!soundEnabled);
              }}
              title={soundEnabled ? 'Mute Sounds' : 'Enable Tactile Audio'}
              className="apple-press p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              aria-label="Toggle sound effects"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>
            <button
              onClick={onClose}
              className="apple-press p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switchers: Alerts vs Personalized Rules */}
        <div className="py-2.5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => {
                soundFx.playTap();
                setActiveTab('alerts');
              }}
              className={`apple-press px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'alerts'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <span>Recent Alerts</span>
              {notifications.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'alerts' ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                soundFx.playTap();
                setActiveTab('preferences');
              }}
              className={`apple-press px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'preferences'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Personalize</span>
            </button>
          </div>

          {activeTab === 'alerts' && notifications.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <button onClick={() => { soundFx.playTap(); onMarkAllRead(); }} className="hover:text-white">
                Mark read
              </button>
              <span>·</span>
              <button onClick={() => { soundFx.playTap(); onClearAll(); }} className="hover:text-white">
                Clear
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <button
              onClick={() => {
                soundFx.playTap();
                onSendTestNotification();
              }}
              className="apple-press text-[11px] text-[#0071e3] hover:underline flex items-center gap-1 font-medium"
            >
              <SendHorizontal className="w-3 h-3" />
              <span>Test Alert</span>
            </button>
          )}
        </div>

        {/* Tab 1: Alerts List */}
        {activeTab === 'alerts' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-white/70">All caught up!</p>
                <p className="text-[11px] mt-1 text-white/40 max-w-xs mx-auto">
                  Your personalized alert engine will notify you when new articles matching your categories or keywords arrive.
                </p>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className="apple-press mt-4 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-white"
                >
                  Configure Alert Watchlist
                </button>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.feedItemId) {
                      soundFx.playTap();
                      onSelectNotification(n.feedItemId);
                      onClose();
                    }
                  }}
                  className={`apple-press p-3 rounded-2xl border transition-all cursor-pointer ${
                    n.read
                      ? 'bg-white/[0.02] border-white/5 text-white/60'
                      : 'bg-white/[0.06] border-white/15 text-white shadow-sm'
                  } hover:border-[#0071e3]/40`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIcon(n.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-white truncate">{n.title}</span>
                        <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Reason badge */}
                      {n.matchedReason && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#42a5f5]">
                          <Tag className="w-3 h-3" />
                          <span>{n.matchedReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Personalized Notification Preferences */}
        {activeTab === 'preferences' && (
          <div className="flex-1 overflow-y-auto py-3 space-y-5 pr-1 text-xs">
            {/* Category Preferences */}
            <div>
              <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Subscribed Categories</span>
                <span className="text-[10px] text-white/40 font-normal">Receive updates for</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'news', label: 'AI News', icon: <Newspaper className="w-3.5 h-3.5 text-cyan-400" /> },
                  { key: 'course', label: 'Free Courses', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> },
                  { key: 'tool', label: 'New Tools', icon: <Wrench className="w-3.5 h-3.5 text-blue-400" /> },
                  { key: 'research', label: 'Research', icon: <BookOpen className="w-3.5 h-3.5 text-purple-400" /> },
                ].map((item) => {
                  const isEnabled = preferences.enabledCategories[item.key as keyof NotificationPreferences['enabledCategories']];
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleToggleCategory(item.key as keyof NotificationPreferences['enabledCategories'])}
                      className={`apple-press p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isEnabled
                          ? 'bg-white/10 border-[#0071e3]/40 text-white'
                          : 'bg-white/[0.02] border-white/5 text-white/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isEnabled ? 'bg-[#0071e3] text-white' : 'bg-white/10 text-transparent'
                      }`}>
                        ✓
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keyword Watchlist */}
            <div>
              <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1.5">
                Keyword Watchlist (High-Priority Alerts)
              </div>
              <p className="text-[11px] text-white/50 mb-2.5">
                Get notified immediately whenever an article, course, or tool matches these exact terms.
              </p>

              {/* Input for adding new keyword */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="e.g. Stanford, DeepSeek, PyTorch..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-[#0071e3]"
                />
                <button
                  onClick={() => handleAddKeyword()}
                  disabled={!newKeywordInput.trim()}
                  className="apple-press px-3 py-2 rounded-xl bg-[#0071e3] disabled:opacity-40 text-white font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Active keyword tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {preferences.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0071e3]/20 border border-[#0071e3]/30 text-xs text-white"
                  >
                    <span>{kw}</span>
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-white/40 hover:text-white ml-0.5"
                      aria-label={`Remove keyword ${kw}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Popular quick-add suggestions */}
              <div>
                <span className="text-[10px] text-white/40 uppercase font-mono block mb-1.5">
                  Popular Topics to Track:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularKeywords
                    .filter((k) => !preferences.keywords.includes(k))
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleAddKeyword(suggestion)}
                        className="apple-press text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white"
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Notification Filters & Delivery */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Only Breaking / HOT Drops</span>
                  </div>
                  <div className="text-[10px] text-white/50">Mute minor updates, alert only for major drops</div>
                </div>
                <button
                  onClick={() => {
                    soundFx.playTap();
                    onUpdatePreferences({ ...preferences, hotOnly: !preferences.hotOnly });
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                    preferences.hotOnly ? 'bg-[#0071e3]' : 'bg-white/20'
                  }`}
                  aria-label="Toggle HOT drops only"
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.hotOnly ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div>
                  <div className="font-semibold text-white">Browser System Push</div>
                  <div className="text-[10px] text-white/50">Show native desktop notification banners</div>
                </div>
                <button
                  onClick={() => {
                    soundFx.playTap();
                    onEnableBrowserNotifications();
                  }}
                  className="apple-press px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] text-white font-medium"
                >
                  Request Permission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2.5 text-[10px] text-white/30 font-mono text-center border-t border-white/5 flex items-center justify-between">
          <span>PERSONALIZED ENGINE: ACTIVE</span>
          <span>{preferences.keywords.length} WATCHED TAGS</span>
        </div>
      </div>
    </div>
  );
};
