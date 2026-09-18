/**
 * HTML Sanitizer module for client-side and server-side text content sanitization.
 * Strips script tags, event handlers (onclick, onerror, etc.), iframes, styles,
 * and disallowed HTML elements while preserving safe formatting tags.
 */

export function sanitizeHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml) return '';
  const input = String(dirtyHtml);

  // 1. Remove script tags and contents
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove iframe, object, embed, style, form, input tags and contents
  clean = clean.replace(/<(iframe|object|embed|style|form|input|button|textarea)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // 3. Remove inline event handlers (e.g., onclick=..., onerror=..., onload=...)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  // 4. Remove javascript: URIs in href or src
  clean = clean.replace(/(href|src)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');

  return clean.trim();
}
