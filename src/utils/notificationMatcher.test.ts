import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  shouldTriggerNotification, 
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences 
} from './notificationMatcher';
import { FeedItem } from '../types';

const mockCourseItem: FeedItem = {
  id: 'test-course',
  title: 'Hugging Face AI Agents Course with Free Certificate',
  summary: 'Learn autonomous agent building with open source weights and colab notebooks.',
  fullStory: 'Detailed course description',
  category: 'course',
  tags: ['Hugging Face', 'Agents', 'Free Certificate'],
  readTime: '45s read',
  publishedAt: 'Just now',
  timestamp: Date.now(),
  sourceName: 'Hugging Face',
  sourceUrl: 'https://huggingface.co',
  isHot: true,
  keyTakeaways: ['Free Certificate', 'Hands-on'],
  readCount: 10,
  bookmarksCount: 2,
};

const mockNewsItem: FeedItem = {
  id: 'test-news',
  title: 'Anthropic updates prompt caching API pricing',
  summary: 'Prompt caching rates reduced by 50% for high token throughput apps.',
  fullStory: 'Pricing update',
  category: 'news',
  tags: ['Anthropic', 'API', 'Pricing'],
  readTime: '30s read',
  publishedAt: '1h ago',
  timestamp: Date.now() - 3600000,
  sourceName: 'Anthropic',
  sourceUrl: 'https://anthropic.com',
  isHot: false,
  keyTakeaways: ['50% cheaper'],
  readCount: 50,
  bookmarksCount: 5,
};

test('shouldTriggerNotification triggers on enabled category', () => {
  const prefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    keywords: [],
    enabledCategories: {
      news: true,
      course: false,
      tool: false,
      research: false,
    },
  };

  const resNews = shouldTriggerNotification(mockNewsItem, prefs);
  assert.equal(resNews.shouldNotify, true);

  const resCourse = shouldTriggerNotification(mockCourseItem, prefs);
  assert.equal(resCourse.shouldNotify, false);
});

test('shouldTriggerNotification triggers on matched watch keywords even across categories', () => {
  const prefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    enabledCategories: {
      news: false,
      course: false,
      tool: false,
      research: false,
    },
    keywords: ['free certificate', 'pricing'],
  };

  const resCourse = shouldTriggerNotification(mockCourseItem, prefs);
  assert.equal(resCourse.shouldNotify, true);
  assert.equal(resCourse.matchedKeyword, 'free certificate');

  const resNews = shouldTriggerNotification(mockNewsItem, prefs);
  assert.equal(resNews.shouldNotify, true);
  assert.equal(resNews.matchedKeyword, 'pricing');
});

test('shouldTriggerNotification respects hotOnly filter', () => {
  const prefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    hotOnly: true,
  };

  const resHot = shouldTriggerNotification(mockCourseItem, prefs);
  assert.equal(resHot.shouldNotify, true);

  const resNotHot = shouldTriggerNotification(mockNewsItem, prefs);
  assert.equal(resNotHot.shouldNotify, false);
});
