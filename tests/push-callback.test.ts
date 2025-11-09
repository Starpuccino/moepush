import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pushCallbackModule from '@/lib/services/push-callback'
import { pushLogger } from '@/lib/utils/push-logger'

declare const global: typeof globalThis

const samplePayload = {
  status: 'success' as const,
  message: 'ok',
  type: 'push' as const,
  traceId: 'trace-1'
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('sendCallback', () => {
  it('returns false and skips when callback url is missing', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({} as Response)

    const result = await pushCallbackModule.sendCallback(null, samplePayload, 'trace-1')

    expect(result).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends payload and resolves true when fetch succeeds', async () => {
    const response = { ok: true, status: 200 } as Response
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(response)

    const result = await pushCallbackModule.sendCallback('https://example.com/cb', samplePayload, 'trace-1', 2000)

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/cb',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Trace-Id': 'trace-1' },
        body: JSON.stringify(samplePayload)
      })
    )
    expect(result).toBe(true)
  })

  it('returns false when fetch returns non-ok response', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: false, status: 500 } as Response)

    const result = await pushCallbackModule.sendCallback('https://example.com/cb', samplePayload, 'trace-1')

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(result).toBe(false)
  })

  it('ignores invalid timeout and waits indefinitely', async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, status: 200 } as Response)

    await pushCallbackModule.sendCallback('https://example.com/cb', samplePayload, 'trace-1', -1)

    // 无效的超时值应该被忽略，不设置任何超时
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(clearTimeoutSpy).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('waits indefinitely when timeout not provided', async () => {
    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, status: 200 } as Response)

    const callPromise = pushCallbackModule.sendCallback('https://example.com/cb', samplePayload, 'trace-1')
    // 立即运行所有微任务
    await vi.runAllTimersAsync()

    const result = await callPromise

    // 未提供超时时，不设置任何超时
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(clearTimeoutSpy).not.toHaveBeenCalled()
    expect(result).toBe(true)

    vi.useRealTimers()
  })

  it('handles fetch rejection and returns false', async () => {
    vi.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('network'))

    const result = await pushCallbackModule.sendCallback('https://example.com/cb', samplePayload, 'trace-1', 100)

    expect(result).toBe(false)
  })
})

describe('sendCallbackAsync', () => {
  it('logs warning when background callback fails', async () => {
    const loggerSpy = vi.spyOn(pushLogger, 'warn').mockImplementation(() => {})
    vi.spyOn(global, 'fetch' as any).mockRejectedValue(new Error('fail'))

  pushCallbackModule.sendCallbackAsync('https://example.com/cb', samplePayload, 'trace-async', 50)
  await Promise.resolve()
  await Promise.resolve()

    expect(loggerSpy).toHaveBeenCalledWith(
      'trace-async',
      'Callback',
      'Background callback failed (ignored)',
      expect.any(Error)
    )
  })
})
