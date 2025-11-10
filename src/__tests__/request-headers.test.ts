import { describe, expect, it, vi } from 'vitest';
import {
  getCallbackTimeout,
  getCallbackUrl,
  getHeaderValue,
  getPositiveIntHeader,
  getTraceId,
  parsePositiveInt
} from '@/lib/utils/request-headers';

describe('request headers utilities', () => {
  it('trims header values and returns null when missing', () => {
    const headers = new Headers({ 'X-Test': '  value  ' });

    expect(getHeaderValue(headers, 'X-Test')).toBe('value');
    expect(getHeaderValue(headers, 'X-Missing')).toBeNull();

    headers.set('X-Blank', '   ');
    expect(getHeaderValue(headers, 'X-Blank')).toBeNull();
  });

  it('parses positive integers with fallback', () => {
    expect(parsePositiveInt('10', 5)).toBe(10);
    expect(parsePositiveInt(7, 5)).toBe(7);
    expect(parsePositiveInt('foo', 5)).toBe(5);
    expect(parsePositiveInt(-3, 5)).toBe(5);
  });

  it('reads positive integer headers with fallback', () => {
    const headers = new Headers({ 'X-Timeout': '3000' });

    expect(getPositiveIntHeader(headers, 'X-Timeout', 1000)).toBe(3000);
    expect(getPositiveIntHeader(headers, 'X-Missing', 1000)).toBe(1000);
  });

  it('retrieves trace id or generates fallback', () => {
    const headers = new Headers({ 'X-Trace-Id': ' trace-123 ' });
    const generator = vi.fn(() => 'generated');

    expect(getTraceId(headers, generator)).toBe('trace-123');
    expect(generator).not.toHaveBeenCalled();

    const emptyHeaders = new Headers();
    expect(getTraceId(emptyHeaders, generator)).toBe('generated');
    expect(generator).toHaveBeenCalledOnce();
  });

  it('returns callback url when present', () => {
    const headers = new Headers({
      'X-Callback-Url': ' https://example.com/cb '
    });
    expect(getCallbackUrl(headers)).toBe('https://example.com/cb');

    headers.set('X-Callback-Url', '   ');
    expect(getCallbackUrl(headers)).toBeNull();
  });

  it('reads callback timeout with fallback', () => {
    const headers = new Headers({ 'X-Callback-Timeout': '2000' });
    expect(getCallbackTimeout(headers, 5000)).toBe(2000);

    headers.set('X-Callback-Timeout', 'not-a-number');
    expect(getCallbackTimeout(headers, 5000)).toBe(5000);
  });
});
