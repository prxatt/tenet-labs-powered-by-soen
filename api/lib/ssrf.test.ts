import { describe, expect, it } from 'vitest';
import { isSafeFetchUrl } from './ssrf';

describe('isSafeFetchUrl', () => {
  it('allows public https URLs', () => {
    expect(isSafeFetchUrl('https://example.com/recipe')).toBe(true);
  });

  it('blocks localhost and private IPs', () => {
    expect(isSafeFetchUrl('http://localhost/admin')).toBe(false);
    expect(isSafeFetchUrl('http://127.0.0.1/')).toBe(false);
    expect(isSafeFetchUrl('http://192.168.1.1/')).toBe(false);
    expect(isSafeFetchUrl('http://10.0.0.1/')).toBe(false);
  });

  it('blocks cloud metadata endpoint', () => {
    expect(isSafeFetchUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('blocks non-http schemes', () => {
    expect(isSafeFetchUrl('file:///etc/passwd')).toBe(false);
  });
});
