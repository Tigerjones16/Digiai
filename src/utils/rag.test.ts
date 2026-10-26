import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, retrieveRelevantItems, buildRagPrompt, localSynthesizeResponse } from './rag';
import { FeedItem } from '../types';

const mockItems: FeedItem[] = [
  {
    id: 'course-1',
    title: 'Stanford CS229: Machine Learning Full Course 2026',
    summary: 'Comprehensive machine learning foundational course taught by Andrew Ng, covering neural networks and reinforcement learning completely free.',
    fullStory: 'Stanford University opened all lectures and assignment materials to global students for free.',
    category: 'course',
    tags: ['Stanford', 'Andrew Ng', 'Machine Learning', 'Free Course'],
    readTime: '45s read',
    publishedAt: '2 hours ago',
    timestamp: Date.now() - 7200000,
    sourceName: 'Stanford Online',
    sourceUrl: 'https://cs229.stanford.edu',
    keyTakeaways: ['100% Free Materials', 'Andrew Ng syllabus', 'Homework with Python'],
    courseDetails: {
      provider: 'Stanford Engineering Everywhere',
      instructor: 'Prof. Andrew Ng',
      freeCertificate: true,
      difficulty: 'Intermediate',
      prerequisites: 'Linear algebra, basic Python',
      enrollUrl: 'https://cs229.stanford.edu',
    },
    readCount: 1420,
    bookmarksCount: 389,
  },
  {
    id: 'tool-1',
    title: 'Claude Code: Autonomous Terminal Coding Agent Released',
    summary: 'Anthropic launched Claude Code, an agentic CLI tool that edits codebases directly, runs unit tests, and integrates git workflows seamlessly.',
    fullStory: 'Claude Code brings deep agentic software engineering to developers with terminal commands.',
    category: 'tool',
    tags: ['Anthropic', 'Claude Code', 'Agent', 'Developer Tools'],
    readTime: '50s read',
    publishedAt: '4 hours ago',
    timestamp: Date.now() - 14400000,
    sourceName: 'Anthropic Research',
    sourceUrl: 'https://anthropic.com',
    keyTakeaways: ['CLI agent for git & bash', 'Automated test loop', 'Direct code editing'],
    toolDetails: {
      pricingModel: 'Open Source',
      repoUrl: 'https://github.com/anthropics/claude-code',
      websiteUrl: 'https://anthropic.com',
      githubStars: '34.2k',
      topFeature: 'Autonomous multi-file refactoring',
    },
    readCount: 2980,
    bookmarksCount: 840,
  },
];

test('tokenize strips stopwords and normalizes words', () => {
  const tokens = tokenize('The Stanford AI course is about machine learning!');
  assert.ok(tokens.includes('stanford'));
  assert.ok(tokens.includes('course'));
  assert.ok(tokens.includes('machine'));
  assert.ok(tokens.includes('learning'));
  assert.equal(tokens.includes('the'), false);
  assert.equal(tokens.includes('is'), false);
});

test('retrieveRelevantItems finds best match by intent', () => {
  const results = retrieveRelevantItems('free stanford course', mockItems, 2);
  assert.ok(results.length >= 1);
  assert.equal(results[0].item.id, 'course-1');
  assert.ok(results[0].score > 5);
});

test('retrieveRelevantItems matches tools by keywords', () => {
  const results = retrieveRelevantItems('claude code terminal agent', mockItems, 2);
  assert.ok(results.length >= 1);
  assert.equal(results[0].item.id, 'tool-1');
});

test('buildRagPrompt builds structured context blocks', () => {
  const prompt = buildRagPrompt('How can I enroll in Stanford course?', [mockItems[0]]);
  assert.ok(prompt.includes('Stanford CS229'));
  assert.ok(prompt.includes('Direct URL: https://cs229.stanford.edu'));
  assert.ok(prompt.includes('Source 1'));
});

test('localSynthesizeResponse outputs grounded answer with links', () => {
  const response = localSynthesizeResponse('Tell me about free courses', [mockItems[0]]);
  assert.ok(response.includes('Stanford CS229'));
  assert.ok(response.includes('Free Certificate Included'));
});
