import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  endpointGroups,
  endpointToGroup
} from '@/lib/db/schema/endpoint-groups';
import { eq } from 'drizzle-orm';
import { ENDPOINT_STATUS } from '@/lib/constants/endpoints';
import {
  createPushGroupResponse,
  PushGroupDetail
} from '@/lib/types/push-response';
import { pushLogger } from '@/lib/utils/push-logger';
import { ConcurrencyLimiter } from '@/lib/utils/concurrency-limiter';
import { sendCallbackAsync } from '@/lib/services/push-callback';
import { generateId } from '@/lib/utils';
import {
  getCallbackTimeout,
  getCallbackUrl,
  getPositiveIntHeader,
  getTraceId,
  parsePositiveInt
} from '@/lib/utils/request-headers';
import {
  DEFAULT_CALLBACK_TIMEOUT,
  DEFAULT_PUSH_GROUP_CONCURRENCY,
  DEFAULT_PUSH_TIMEOUT
} from '@/lib/constants/config';

export const runtime = 'edge';

/**
 * 调用单个端点推送
 */
async function callPushEndpoint(
  endpointId: string,
  endpointName: string,
  body: any,
  timeout: number,
  traceId: string,
  originUrl: string
): Promise<PushGroupDetail> {
  try {
    const url = `${originUrl}/api/push/${endpointId}`;

    pushLogger.debug(traceId, 'GroupPush', `Calling endpoint ${endpointName}`, {
      endpointId,
      timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
          'X-Timeout': timeout.toString()
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        pushLogger.warn(
          traceId,
          'GroupPush',
          `Endpoint ${endpointName} failed`,
          {
            endpointId,
            statusCode: response.status
          }
        );
        return {
          endpointId,
          endpoint: endpointName,
          status: 'failed',
          message: text || `HTTP ${response.status}`
        };
      }

      pushLogger.info(
        traceId,
        'GroupPush',
        `Endpoint ${endpointName} succeeded`,
        {
          endpointId
        }
      );

      return {
        endpointId,
        endpoint: endpointName,
        status: 'success',
        message: '推送成功'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    pushLogger.error(
      traceId,
      'GroupPush',
      `Endpoint ${endpointName} error`,
      error
    );

    return {
      endpointId,
      endpoint: endpointName,
      status: 'failed',
      message: errorMessage
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = getTraceId(request.headers, generateId);
  const timeout = getPositiveIntHeader(
    request.headers,
    'X-Timeout',
    parsePositiveInt(process.env.PUSH_TIMEOUT, DEFAULT_PUSH_TIMEOUT)
  );
  const callbackUrl = getCallbackUrl(request.headers);
  const callbackTimeout = getCallbackTimeout(
    request.headers,
    parsePositiveInt(process.env.CALLBACK_TIMEOUT, DEFAULT_CALLBACK_TIMEOUT)
  );
  const isAsync = Boolean(callbackUrl);
  const concurrency = parsePositiveInt(
    process.env.PUSH_GROUP_CONCURRENCY,
    DEFAULT_PUSH_GROUP_CONCURRENCY
  );

  pushLogger.info(traceId, 'GroupPushRequest', 'Received group push request', {
    groupId: (await params).id,
    isAsync,
    timeout,
    concurrency,
    hasCallback: !!callbackUrl
  });

  try {
    const { id } = await params;

    const db = await getDb();

    // 获取端点组
    const group = await db.query.endpointGroups.findFirst({
      where: eq(endpointGroups.id, id)
    });

    if (!group) {
      pushLogger.warn(traceId, 'GroupPushRequest', 'Group not found', {
        groupId: id
      });
      return NextResponse.json(
        createPushGroupResponse('failed', '接口组不存在', traceId, {
          total: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 0,
          details: []
        }),
        { status: 404 }
      );
    }

    if (group.status === ENDPOINT_STATUS.INACTIVE) {
      pushLogger.warn(traceId, 'GroupPushRequest', 'Group is disabled', {
        groupId: id
      });
      return NextResponse.json(
        createPushGroupResponse('failed', '接口组已禁用', traceId, {
          total: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 0,
          details: []
        }),
        { status: 403 }
      );
    }

    // 获取端点列表
    const relations = await db.query.endpointToGroup.findMany({
      where: eq(endpointToGroup.groupId, id),
      with: {
        endpoint: true
      }
    });

    const allEndpoints = relations.map((r: any) => r.endpoint);

    if (allEndpoints.length === 0) {
      pushLogger.warn(traceId, 'GroupPushRequest', 'Group has no endpoints', {
        groupId: id
      });
      return NextResponse.json(
        createPushGroupResponse('failed', '接口组不包含任何接口', traceId, {
          total: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 0,
          details: []
        }),
        { status: 400 }
      );
    }

    // 预过滤：仅保留活跃端点
    const activeEndpoints = allEndpoints.filter(
      (ep: any) => ep.status === 'active'
    );
    const skippedCount = allEndpoints.length - activeEndpoints.length;

    pushLogger.info(traceId, 'GroupPushRequest', 'Endpoints filtered', {
      total: allEndpoints.length,
      active: activeEndpoints.length,
      skipped: skippedCount
    });

    const body = await request.json();
    const origin = new URL(request.url).origin;

    // 异步模式：立即返回 202，后台处理
    if (isAsync) {
      pushLogger.info(
        traceId,
        'GroupPushRequest',
        'Async mode: returning 202 immediately'
      );

      // 后台执行推送
      (async () => {
        try {
          const limiter = new ConcurrencyLimiter(concurrency);
          const details: PushGroupDetail[] = [];

          const settledResults = await limiter.runAll(
            activeEndpoints.map((endpoint: any) => async () => {
              const result = await callPushEndpoint(
                endpoint.id,
                endpoint.name,
                body,
                timeout,
                traceId,
                origin
              );
              details.push(result);
              return result;
            })
          );

          settledResults.forEach((result, index) => {
            if (result.status === 'rejected') {
              const endpoint = activeEndpoints[index];
              details.push({
                endpointId: endpoint.id,
                endpoint: endpoint.name,
                status: 'failed',
                message:
                  result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason)
              });
            }
          });

          // 添加跳过的端点到详情
          for (const ep of allEndpoints) {
            if (ep.status !== 'active') {
              details.push({
                endpointId: ep.id,
                endpoint: ep.name,
                status: 'skipped',
                message: '接口已禁用'
              });
            }
          }

          // 计算统计
          const successCount = details.filter(
            (detail) => detail.status === 'success'
          ).length;
          const failedCount = details.filter(
            (detail) => detail.status === 'failed'
          ).length;
          const overallStatus = deriveGroupStatus(
            successCount,
            failedCount,
            skippedCount
          );

          const response = createPushGroupResponse(
            overallStatus,
            `接口组处理完成 (成功: ${successCount}, 失败: ${failedCount}, 跳过: ${skippedCount})`,
            traceId,
            {
              total: allEndpoints.length,
              successCount,
              failedCount,
              skippedCount,
              details
            }
          );

          pushLogger.info(traceId, 'GroupPushRequest', 'Sending callback', {
            callbackUrl,
            callbackTimeout,
            successCount,
            failedCount,
            skippedCount
          });

          sendCallbackAsync(callbackUrl, response, traceId, callbackTimeout);
        } catch (error) {
          pushLogger.error(
            traceId,
            'GroupPushRequest',
            'Background task error',
            error
          );
        }
      })();

      // 立即返回 202
      return NextResponse.json(
        createPushGroupResponse('success', '请求已接受，正在处理中', traceId, {
          total: allEndpoints.length,
          successCount: 0,
          failedCount: 0,
          skippedCount: skippedCount,
          details: []
        }),
        { status: 202 }
      );
    }

    // 同步模式：等待推送完成后返回
    const limiter = new ConcurrencyLimiter(concurrency);
    const details: PushGroupDetail[] = [];

    const settledResults = await limiter.runAll(
      activeEndpoints.map((endpoint: any) => async () => {
        const result = await callPushEndpoint(
          endpoint.id,
          endpoint.name,
          body,
          timeout,
          traceId,
          origin
        );
        details.push(result);
        return result;
      })
    );

    settledResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const endpoint = activeEndpoints[index];
        details.push({
          endpointId: endpoint.id,
          endpoint: endpoint.name,
          status: 'failed',
          message:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
        });
      }
    });

    // 添加跳过的端点到详情
    for (const ep of allEndpoints) {
      if (ep.status !== 'active') {
        details.push({
          endpointId: ep.id,
          endpoint: ep.name,
          status: 'skipped',
          message: '接口已禁用'
        });
      }
    }

    // 计算统计
    const successCount = details.filter(
      (detail) => detail.status === 'success'
    ).length;
    const failedCount = details.filter(
      (detail) => detail.status === 'failed'
    ).length;
    const overallStatus = deriveGroupStatus(
      successCount,
      failedCount,
      skippedCount
    );

    pushLogger.info(traceId, 'GroupPushRequest', 'Sync group push completed', {
      total: allEndpoints.length,
      successCount,
      failedCount,
      skippedCount,
      overallStatus
    });

    const response = createPushGroupResponse(
      overallStatus,
      `接口组处理完成 (成功: ${successCount}, 失败: ${failedCount}, 跳过: ${skippedCount})`,
      traceId,
      {
        total: allEndpoints.length,
        successCount,
        failedCount,
        skippedCount,
        details
      }
    );
    return NextResponse.json(response, {
      status: overallStatus === 'failed' ? 500 : 200
    });
  } catch (error) {
    pushLogger.error(
      traceId,
      'GroupPushRequest',
      'Request handling error',
      error
    );
    return NextResponse.json(
      createPushGroupResponse('failed', '处理接口组请求时出错', traceId, {
        total: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        details: []
      }),
      { status: 500 }
    );
  }
}

function deriveGroupStatus(
  successCount: number,
  failedCount: number,
  skippedCount: number
): 'success' | 'partial' | 'failed' {
  if (failedCount <= 0 && skippedCount <= 0) {
    return 'success';
  }

  if (successCount <= 0 && failedCount > 0) {
    return 'failed';
  }

  return 'partial';
}
