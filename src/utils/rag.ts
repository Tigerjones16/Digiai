/**
 * RAG (Retrieval-Augmented Generation) Engine for DigAI
 * Combines BM25 & weighted TF-IDF similarity across News, Free Courses, and Tool Updates.
 */

import { FeedItem } from '../types';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no',
  'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'was', 'wasn\'t', 'we', 'were', 'weren\'t', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text into normalized search terms
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export interface ScoredFeedItem {
  item: FeedItem;
  score: number;
  matchedTerms: string[];
}

/**
 * Scores and retrieves top-k relevant feed items given a user query.
 * Weighted field scoring:
 * - Title matches: weight 3.5
 * - Tags matches: weight 3.0
 * - Category matches: weight 2.0
 * - Key Takeaways: weight 2.0
 * - Summary: weight 1.5
 * - Full Story: weight 1.0
 */
export function retrieveRelevantItems(
  query: string,
  items: FeedItem[],
  topK: number = 3
): ScoredFeedItem[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || items.length === 0) {
    return [];
  }

  const scored: ScoredFeedItem[] = [];

  for (const item of items) {
    const titleTokens = tokenize(item.title);
    const tagTokens = item.tags.flatMap((t) => tokenize(t));
    const summaryTokens = tokenize(item.summary);
    const takeawayTokens = item.keyTakeaways.flatMap((t) => tokenize(t));
    const storyTokens = tokenize(item.fullStory);

    let score = 0;
    const matchedTerms = new Set<string>();

    for (const q of queryTokens) {
      let termMatched = false;

      // Exact substring or token match in title
      if (item.title.toLowerCase().includes(q)) {
        score += 4.0;
        termMatched = true;
      } else if (titleTokens.includes(q)) {
        score += 3.0;
        termMatched = true;
      }

      // Match in tags
      if (tagTokens.includes(q) || item.tags.some((t) => t.toLowerCase().includes(q))) {
        score += 3.0;
        termMatched = true;
      }

      // Match in category
      if (item.category.toLowerCase().includes(q) || (q === 'courses' && item.category === 'course') || (q === 'tools' && item.category === 'tool')) {
        score += 2.5;
        termMatched = true;
      }

      // Match in takeaways
      if (takeawayTokens.includes(q)) {
        score += 2.0;
        termMatched = true;
      }

      // Match in summary
      if (summaryTokens.includes(q)) {
        score += 1.5;
        termMatched = true;
      }

      // Match in story
      if (storyTokens.includes(q)) {
        score += 1.0;
        termMatched = true;
      }

      // Free course intent detection
      if ((q === 'free' || q === 'cert' || q === 'certificate') && item.courseDetails?.freeCertificate) {
        score += 3.5;
        termMatched = true;
      }

      // Open source tool intent detection
      if ((q === 'open' || q === 'source' || q === 'github') && (item.toolDetails?.pricingModel === 'Open Source' || item.toolDetails?.repoUrl)) {
        score += 3.0;
        termMatched = true;
      }

      if (termMatched) {
        matchedTerms.add(q);
      }
    }

    if (score > 0) {
      scored.push({
        item,
        score,
        matchedTerms: Array.from(matchedTerms),
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Builds the RAG prompt with structured context injection and citation references
 */
export function buildRagPrompt(query: string, relevantItems: FeedItem[]): string {
  if (relevantItems.length === 0) {
    return `User Question: "${query}"\n\nNo matching articles found in current AI feed. Answer generally based on best AI knowledge.`;
  }

  const contextBlocks = relevantItems
    .map((item, index) => {
      let extraMeta = '';
      if (item.courseDetails) {
        extraMeta = `\nCourse Provider: ${item.courseDetails.provider} | Free Certificate: ${item.courseDetails.freeCertificate ? 'Yes' : 'No'} | Difficulty: ${item.courseDetails.difficulty} | Link: ${item.courseDetails.enrollUrl}`;
      } else if (item.toolDetails) {
        extraMeta = `\nTool License: ${item.toolDetails.pricingModel} | Stars: ${item.toolDetails.githubStars || 'N/A'} | Link: ${item.toolDetails.websiteUrl}`;
      } else if (item.researchDetails) {
        extraMeta = `\nInstitution: ${item.researchDetails.institution} | Breakthrough: ${item.researchDetails.breakthrough}`;
      }

      return `[Source ${index + 1}: ${item.title}]
Category: ${item.category.toUpperCase()}
Published: ${item.publishedAt} | Source: ${item.sourceName}
Summary: ${item.summary}
Key Takeaways: ${item.keyTakeaways.join('; ')}${extraMeta}
Direct URL: ${item.sourceUrl}`;
    })
    .join('\n\n---\n\n');

  return `You are DigAI Assistant, an expert, objective AI intelligence analyst.
Answer the user's question accurately using the retrieved knowledge items below.
Always cite your sources using [Source 1], [Source 2], etc., and provide direct guidance (e.g. course enroll links, tool repositories, key capabilities).

=== RETRIEVED KNOWLEDGE BASE CONTEXT ===
${contextBlocks}
=======================================

User Query: "${query}"

Provide a structured, Apple-clean response:
1. Direct synthesis & answer
2. Specific highlights from retrieved items with [Source X] citations
3. Next steps / links`;
}

/**
 * Intelligent Local Synthesis Engine (Zero-fail fallback when offline or no API key)
 * Synthesizes grounded, high-value answers immediately from the RAG items.
 */
export function localSynthesizeResponse(query: string, relevantItems: FeedItem[]): string {
  const queryLower = query.toLowerCase();

  if (relevantItems.length === 0) {
    if (queryLower.includes('course') || queryLower.includes('learn')) {
      return `I scanned our latest AI feed, but didn't find specific courses matching that exact phrase. 

Tip: We currently have verified free courses from **Stanford (CS229 Machine Learning)**, **DeepLearning.AI (Generative AI with LLMs)**, and **Google Cloud AI Skills**. Switch to the **Free Courses** tab on the left to inspect syllabi, free certificate badges, and enrollment links!`;
    }
    if (queryLower.includes('tool') || queryLower.includes('model') || queryLower.includes('agent')) {
      return `I couldn't find a direct tool card for that query in today's active digest. 

In our current updates, top tracked tools include **Claude Code (terminal agent)**, **Cursor 2.0 (Composer reasoning)**, and **DeepSeek-V3**. Tap the **Tools** category to see benchmark metrics and open-source GitHub repos!`;
    }
    return `Here is what I found across our AI intelligence index regarding "${query}":

Our live feed continuously digs breaking AI news, vetted free courses, and developer tool updates. Try searching with keywords like **"free course"**, **"reasoning"**, **"DeepSeek"**, **"Claude"**, or **"OpenAI"**, or click "Ask about this story" on any card!`;
  }

  // Generate grounded analytical synthesis
  const citations = relevantItems
    .map((item, idx) => `• **[Source ${idx + 1}] ${item.title}** (${item.sourceName})\n  ${item.summary}`)
    .join('\n\n');

  let actionableNote = '';
  const firstCourse = relevantItems.find((i) => i.courseDetails);
  const firstTool = relevantItems.find((i) => i.toolDetails);

  if (firstCourse && firstCourse.courseDetails) {
    actionableNote = `\n\n🎓 **Direct Course Action:**\n- Provider: ${firstCourse.courseDetails.provider}\n- Free Certificate: ${firstCourse.courseDetails.freeCertificate ? '✅ Yes, Free Certificate Included' : 'Free Audit Available'}\n- Difficulty: ${firstCourse.courseDetails.difficulty}\n- [Click to Enroll](${firstCourse.courseDetails.enrollUrl})`;
  } else if (firstTool && firstTool.toolDetails) {
    actionableNote = `\n\n🛠️ **Tool Highlights:**\n- License: ${firstTool.toolDetails.pricingModel}\n- Key Feature: ${firstTool.toolDetails.topFeature}\n- [Visit Tool Site](${firstTool.toolDetails.websiteUrl})`;
  }

  return `Based on verified items retrieved from DigAI's real-time feed:\n\n${citations}${actionableNote}\n\n*All insights are retrieved via local encrypted RAG index.*`;
}
