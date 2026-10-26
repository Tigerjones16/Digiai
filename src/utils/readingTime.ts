/**
 * Utility to calculate and format estimated reading time.
 * Standard adult reading speed is approximately 200-230 words per minute.
 * For technical summaries with code or research terminology, 180-200 WPM is standard.
 */

export function calculateReadingTime(
  title: string = '',
  summary: string = '',
  fullStory?: string
): string {
  const combinedText = `${title} ${summary} ${fullStory || ''}`.trim();
  if (!combinedText) {
    return '1 min read';
  }

  // Count words accurately
  const words = combinedText.split(/\s+/).filter((w) => w.length > 0).length;

  // Assuming an average reading pace of 180 words per minute
  // For deep articles or courses with details, calculate realistic read time
  const minutes = Math.max(1, Math.ceil(words / 180));

  return `${minutes} min read`;
}
