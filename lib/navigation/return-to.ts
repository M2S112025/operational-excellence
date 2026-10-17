/** Navigation context only: destination routes retain their own authorization gates. */
export function validateReturnTo(value?: string | null, depth = 0): string | undefined {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value, 'https://ops.invalid');
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://ops.invalid' || /[\\\u0000-\u0020\u007f]/.test(path) || path.includes('//') || /%|(?:^|\/)\.\.(?:\/|$)/.test(path) || /(?:^|\/)\.\.(?:\/|$)/.test(value.split('?')[0])) return undefined;
    if (!/^\/(?:actions|audits|gemba|continuous-improvement|visual-management|5s\/(?:red|audits|actions))(?:\/[A-Za-z0-9_-]+)*(?:\/)?$/.test(path)) return undefined;
    if (url.searchParams.has('returnTo') && (depth >= 1 || !validateReturnTo(url.searchParams.get('returnTo'), depth + 1))) return undefined;
    return url.pathname + url.search + url.hash;
  } catch { return undefined; }
}
export function withActionReturn(actionId: string, returnTo?: string) {
  const path = `/actions/${encodeURIComponent(actionId)}`;
  const safe = validateReturnTo(returnTo);
  return safe ? `${path}?${new URLSearchParams({ returnTo: safe })}` : path;
}
export function currentReturnPath(fallback: string) {
  if (typeof window === 'undefined' || !window.location) return fallback;
  return validateReturnTo(window.location.pathname + window.location.search + window.location.hash) ?? fallback;
}
