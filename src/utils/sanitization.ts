import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows a safe subset of tags and attributes suitable for rich text.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'b', 'i', 'em', 'strong', 'span',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'figure', 'figcaption', 'div'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel',
      'class', 'id', 'width', 'height', 'loading'
    ],
    FORBID_ATTR: ['style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Strips all HTML tags from a string.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

const CUSTOM_SECTION_MAX_LENGTH = 20000;

/**
 * Sanitizes admin-authored "Custom HTML" homepage section markup. Scripts,
 * event handlers, forms, and embeds are stripped; inline `style` attributes
 * are allowed since pasted markup has no build-time CSS to rely on.
 */
export function sanitizeCustomSectionHtml(html: string): string {
  if (!html) return '';

  const clamped = html.slice(0, CUSTOM_SECTION_MAX_LENGTH);

  return DOMPurify.sanitize(clamped, {
    ALLOWED_TAGS: [
      'div', 'span', 'section', 'article', 'header', 'footer', 'aside', 'nav',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'blockquote',
      'ul', 'ol', 'li',
      'b', 'i', 'em', 'strong', 'small', 'sub', 'sup', 'mark',
      'a', 'button',
      'img', 'picture', 'source', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'srcset', 'sizes', 'media', 'alt', 'title', 'target', 'rel',
      'class', 'id', 'width', 'height', 'loading', 'style', 'aria-label', 'role',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'video', 'audio', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}
