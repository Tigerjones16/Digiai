import { FeedItem } from '../types';

export interface NotificationPreferences {
  enabledCategories: {
    news: boolean;
    course: boolean;
    tool: boolean;
    research: boolean;
  };
  keywords: string[];
  hotOnly: boolean;
  soundAlerts: boolean;
  browserPush: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabledCategories: {
    news: true,
    course: true,
    tool: true,
    research: true,
  },
  keywords: ['free certificate', 'agents', 'deepseek', 'claude', 'open source'],
  hotOnly: false,
  soundAlerts: true,
  browserPush: false,
};

export interface NotificationMatchResult {
  shouldNotify: boolean;
  matchedReason?: string;
  matchedKeyword?: string;
}

/**
 * Pure function: Evaluates whether a feed item should trigger an alert
 * based on user personalized preferences (category filters, hot-only rule, keyword watchlists).
 */
export function shouldTriggerNotification(
  item: FeedItem,
  prefs: NotificationPreferences
): NotificationMatchResult {
  // 1. Hot only check
  if (prefs.hotOnly && !item.isHot) {
    return { shouldNotify: false };
  }

  // 2. Keyword watch match (Keywords have highest priority and can trigger alerts across any item)
  if (prefs.keywords && prefs.keywords.length > 0) {
    const titleLower = item.title.toLowerCase();
    const summaryLower = item.summary.toLowerCase();
    const tagsLower = item.tags.map((t) => t.toLowerCase());

    for (const rawKw of prefs.keywords) {
      const kw = rawKw.trim().toLowerCase();
      if (!kw) continue;

      const titleMatch = titleLower.includes(kw);
      const summaryMatch = summaryLower.includes(kw);
      const tagMatch = tagsLower.some((t) => t.includes(kw) || kw.includes(t));

      if (titleMatch || summaryMatch || tagMatch) {
        return {
          shouldNotify: true,
          matchedReason: `Watched keyword: "${rawKw.trim()}"`,
          matchedKeyword: rawKw.trim(),
        };
      }
    }
  }

  // 3. Category subscription check
  const categoryEnabled = prefs.enabledCategories[item.category] ?? true;
  if (!categoryEnabled) {
    return { shouldNotify: false };
  }

  // Matched category
  const categoryLabels: Record<FeedItem['category'], string> = {
    news: 'AI News',
    course: 'Free Course',
    tool: 'Tool Update',
    research: 'Research Paper',
  };

  return {
    shouldNotify: true,
    matchedReason: `Subscribed category: ${categoryLabels[item.category]}`,
  };
}
