import { describe, expect, it } from 'vitest';
import {
  createPushGroupResponse,
  createPushResponse
} from '@/types/push-response';

describe('push response helpers', () => {
  it('creates push response with correct structure', () => {
    const response = createPushResponse('success', 'ok', 'trace-1');

    expect(response).toEqual({
      status: 'success',
      message: 'ok',
      type: 'push',
      traceId: 'trace-1'
    });
  });

  it('creates group response and preserves provided data', () => {
    const response = createPushGroupResponse('partial', 'summary', 'trace-2', {
      total: 3,
      successCount: 2,
      failedCount: 1,
      skippedCount: 0,
      details: [
        {
          endpointId: 'a',
          endpoint: 'Endpoint A',
          status: 'success',
          message: 'ok'
        },
        {
          endpointId: 'b',
          endpoint: 'Endpoint B',
          status: 'failed',
          message: 'err'
        },
        { endpointId: 'c', endpoint: 'Endpoint C', status: 'skipped' }
      ]
    });

    expect(response).toEqual({
      status: 'partial',
      message: 'summary',
      type: 'group',
      traceId: 'trace-2',
      data: {
        total: 3,
        successCount: 2,
        failedCount: 1,
        skippedCount: 0,
        details: [
          {
            endpointId: 'a',
            endpoint: 'Endpoint A',
            status: 'success',
            message: 'ok'
          },
          {
            endpointId: 'b',
            endpoint: 'Endpoint B',
            status: 'failed',
            message: 'err'
          },
          { endpointId: 'c', endpoint: 'Endpoint C', status: 'skipped' }
        ]
      }
    });
  });
});
