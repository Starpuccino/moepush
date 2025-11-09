/**
 * 推送回调服务
 * 发送异步推送的回调请求
 */

import { PushResponseType } from '@/lib/types/push-response'
import { pushLogger } from '@/lib/utils/push-logger'

/**
 * 发送回调请求
 * @param callbackUrl 回调地址
 * @param data 回调数据
 * @param traceId 追踪ID
 * @param timeout 超时时间（毫秒），未提供时无限等待
 * @returns 是否成功发送
 */
export async function sendCallback(
  callbackUrl: string | null,
  data: PushResponseType,
  traceId: string,
  timeout?: number
): Promise<boolean> {
  if (!callbackUrl) {
    // pushLogger.debug(traceId, 'Callback', 'No callback url provided, skipping callback dispatch')
    return false
  }

  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  // 仅当timeout被明确指定且有效时才设置超时
  if (timeout !== undefined && Number.isFinite(timeout) && timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeout)
  }

  try {
    pushLogger.debug(traceId, 'Callback', 'Sending callback', {
      url: callbackUrl,
      dataType: data.type,
      timeout: timeout ?? 'no limit'
    })

    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify(data),
      signal: controller.signal
    })

    if (response.ok) {
      pushLogger.info(traceId, 'Callback', 'Callback sent successfully', {
        statusCode: response.status,
        url: callbackUrl
      })
      return true
    } else {
      pushLogger.warn(traceId, 'Callback', 'Callback response error', {
        statusCode: response.status,
        url: callbackUrl
      })
      return false
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      pushLogger.error(traceId, 'Callback', 'Callback timeout', error)
    } else {
      pushLogger.error(traceId, 'Callback', 'Callback request failed', error)
    }
    return false
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * 在后台异步发送回调（不等待结果）
 * @param callbackUrl 回调地址
 * @param data 回调数据
 * @param traceId 追踪ID
 * @param timeout 超时时间（毫秒），未提供时无限等待
 */
export function sendCallbackAsync(
  callbackUrl: string | null,
  data: PushResponseType,
  traceId: string,
  timeout?: number
): void {
  // 在后台发送回调，不等待结果
  void sendCallback(callbackUrl, data, traceId, timeout)
    .then((success) => {
      if (callbackUrl && !success) {
        pushLogger.warn(
          traceId,
          'Callback',
          'Background callback failed (ignored)',
          new Error('callback did not complete successfully')
        )
      }
    })
    .catch((error) => {
      pushLogger.warn(traceId, 'Callback', 'Background callback failed (ignored)', error)
    })
}
