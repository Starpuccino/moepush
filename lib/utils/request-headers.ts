/**
 * 统一处理 HTTP Header 读取与规范化的工具函数。
 */

/**
 * 去除头部值首尾空格，若不存在或为空则返回 null。
 */
export function getHeaderValue(headers: Headers, name: string): string | null {
  const raw = headers.get(name)
  if (!raw) {
    return null
  }

  const value = raw.trim()
  return value.length > 0 ? value : null
}

/**
 * 解析数值型 Header，确保得到正整数。
 */
export function getPositiveIntHeader(
  headers: Headers,
  name: string,
  fallback: number
): number {
  const value = getHeaderValue(headers, name)
  return parsePositiveInt(value, fallback)
}

/**
 * 将给定值尝试解析为正整数，失败则返回默认值。
 */
export function parsePositiveInt(
  value: string | number | null | undefined,
  fallback: number
): number {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric === 'number' && Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric)
  }
  return fallback
}

/**
 * 获取 TraceId，若 Header 缺失则调用 fallback 生成。
 */
export function getTraceId(headers: Headers, fallback: () => string): string {
  const value = getHeaderValue(headers, 'X-Trace-Id')
  return value ?? fallback()
}

/**
 * 获取可选的回调地址 Header。
 */
export function getCallbackUrl(headers: Headers): string | null {
  return getHeaderValue(headers, 'X-Callback-Url')
}

/**
 * 读取回调超时时间 Header，提供默认值回退。
 */
export function getCallbackTimeout(headers: Headers, fallback: number): number {
  return getPositiveIntHeader(headers, 'X-Callback-Timeout', fallback)
}
