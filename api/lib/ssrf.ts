const BLOCKED_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '[::1]',
  'metadata.google.internal', '169.254.169.254',
]);

export function isSafeFetchUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host.startsWith('[') && host.includes('::')) return false;
    return true;
  } catch {
    return false;
  }
}
