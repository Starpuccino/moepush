import { describe, expect, it } from 'vitest'
import { ConcurrencyLimiter } from '@/lib/utils/concurrency-limiter'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('ConcurrencyLimiter', () => {
  it('respects configured concurrency limits', async () => {
    const limiter = new ConcurrencyLimiter(2)
    let activeTasks = 0
    let maxActiveTasks = 0

    const tasks = Array.from({ length: 6 }, (_, index) => async () => {
      activeTasks++
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks)

      await sleep(5)

      activeTasks--
      return index
    })

    const results = await limiter.runAll(tasks)

    results.forEach((result, index) => {
      expect(result.status).toBe('fulfilled')
      if (result.status === 'fulfilled') {
        expect(result.value).toBe(index)
      }
    })

    expect(maxActiveTasks).toBeLessThanOrEqual(2)
  })

  it('collects rejected tasks without interrupting others', async () => {
    const limiter = new ConcurrencyLimiter(2)

    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('done')
    ]

    const results = await limiter.runAll(tasks)

    expect(results[0].status).toBe('fulfilled')
    if (results[0].status === 'fulfilled') {
      expect(results[0].value).toBe('ok')
    }

    expect(results[1].status).toBe('rejected')
    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(Error)
      expect((results[1].reason as Error).message).toBe('fail')
    }

    expect(results[2].status).toBe('fulfilled')
    if (results[2].status === 'fulfilled') {
      expect(results[2].value).toBe('done')
    }
  })

  it('executes queued tasks in order received', async () => {
    const limiter = new ConcurrencyLimiter(1)
    const executionOrder: number[] = []

    const tasks = Array.from({ length: 4 }, (_, index) => async () => {
      await sleep(1)
      executionOrder.push(index)
    })

    await limiter.runAll(tasks)

    expect(executionOrder).toEqual([0, 1, 2, 3])
  })

  it('handles zero tasks gracefully', async () => {
    const limiter = new ConcurrencyLimiter(3)

    const results = await limiter.runAll([])

    expect(results).toHaveLength(0)
  })

  it('allows concurrency greater than task count', async () => {
    const limiter = new ConcurrencyLimiter(5)
    let maxActive = 0
    let active = 0

    const tasks = Array.from({ length: 3 }, () => async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await sleep(2)
      active--
    })

    const results = await limiter.runAll(tasks)

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true)
    expect(maxActive).toBe(3)
  })
})
