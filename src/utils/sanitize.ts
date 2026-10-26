import DOMPurify from 'dompurify';

/**
 * Universal Sanitizer: Strips scripts, inline event handlers, and javascript pseudo-protocols
 * Rule 5: Never use innerHTML or dangerouslySetInnerHTML. Render model and news text as plain text,
 * or sanitize markdown with DOMPurify.
 */
export function sanitizeHtml(untrustedText: string): string {
  if (!untrustedText) return '';

  // In browser environment where window.DOMPurify or DOMPurify.sanitize is ready
  if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(untrustedText);
  }

  // Safe fallback sanitizer in Node / SSR / test environments
  return untrustedText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/javascript:[^\s"'>]+/gi, '#');
}
