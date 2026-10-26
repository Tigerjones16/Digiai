export type CategoryType = 'all' | 'news' | 'course' | 'tool' | 'research';

export interface FeedItem {
  id: string;
  title: string;
  summary: string; // 50-70 words punchy Inshorts style
  fullStory: string;
  category: 'news' | 'course' | 'tool' | 'research';
  tags: string[];
  readTime: string; // e.g. "45 sec read"
  publishedAt: string; // ISO string or relative time
  timestamp: number;
  sourceName: string;
  sourceUrl: string;
  isHot?: boolean;
  isNew?: boolean;
  keyTakeaways: string[];
  // Category-specific metadata
  courseDetails?: {
    provider: string; // e.g. "Stanford / Coursera", "DeepLearning.AI"
    instructor?: string;
    freeCertificate: boolean;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    prerequisites: string;
    enrollUrl: string;
  };
  toolDetails?: {
    pricingModel: '100% Free' | 'Open Source' | 'Freemium';
    repoUrl?: string;
    websiteUrl: string;
    githubStars?: string;
    version?: string;
    topFeature: string;
  };
  researchDetails?: {
    arxivId?: string;
    institution: string;
    breakthrough: string;
  };
  readCount: number;
  bookmarksCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: Array<{
    id: string;
    title: string;
    category: string;
    sourceName: string;
    sourceUrl: string;
  }>;
  ragContextCount?: number;
}

export interface EncryptedApiKeyData {
  ciphertext: string;
  iv: string;
  salt: string;
  maskedKey: string;
  timestamp: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'news' | 'course' | 'tool' | 'research' | 'system';
  timestamp: number;
  read: boolean;
  feedItemId?: string;
  matchedReason?: string;
  matchedKeyword?: string;
}

export interface UserPreferences {
  autoRefreshIntervalSeconds: number; // 30, 60, 300, 0 (manual)
  soundEffectsEnabled: boolean;
  notificationsEnabled: boolean;
  displayMode: 'inshorts' | 'compact';
  savedBookmarks: string[];
  readItems: string[];
}
