import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { endpoints } from '@/lib/db/schema/endpoints';
import { eq } from 'drizzle-orm';
import { safeInterpolate } from '@/lib/template';
import { sendChannelMessage } from '@/lib/channels';
import { createPushResponse } from '@/lib/types/push-response';
import { pushLogger } from '@/lib/utils/push-logger';
import { sendCallbackAsync } from '@/lib/services/push-callback';
import { generateId } from '@/lib/utils';
import {
  getCallbackTimeout,
  getCallbackUrl,
  getPositiveIntHeader,
  getTraceId
} from '@/lib/utils/request-headers';
import config from '@/lib/constants/config';

export const runtime = 'edge';

/**
 * 执行推送（带超时控制）
 */
async function executePush(
  endpoint: any,
  body: any,
  timeout: number,
  traceId: string
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const processedTemplate = safeInterpolate(endpoint.rule, { body });
    let messageObj: unknown;

    try {
      messageObj = JSON.parse(processedTemplate);
    } catch (error) {
      pushLogger.error(traceId, 'Push', 'Template parsing failed', error);
      return { success: false, error: '推送模板解析失败' };
    }

    pushLogger.debug(traceId, 'Push', 'Executing push', {
      endpointId: endpoint.id,
      channelType: endpoint.channel.type,
      timeout
    });

    await sendChannelMessage(endpoint.channel.type as any, messageObj, {
      webhook: endpoint.channel.webhook,
      secret: endpoint.channel.secret,
      corpId: endpoint.channel.corpId,
      agentId: endpoint.channel.agentId,
      botToken: endpoint.channel.botToken,
      chatId: endpoint.channel.chatId
    });

    pushLogger.info(traceId, 'Push', 'Push executed successfully', {
      endpointId: endpoint.id,
      channelType: endpoint.channel.type
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (error instanceof Error && error.name === 'AbortError') {
      pushLogger.error(traceId, 'Push', 'Push timeout', error);
      return { success: false, error: '推送超时' };
    }

    pushLogger.error(traceId, 'Push', 'Push execution failed', error);
    return { success: false, error: errorMessage };
  } finally {
    clearTimeout(timeoutId);
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
    config.PUSH_TIMEOUT
  );
  const callbackUrl = getCallbackUrl(request.headers);
  const callbackTimeout = getCallbackTimeout(request.headers, config.CALLBACK_TIMEOUT);
  const isAsync = Boolean(callbackUrl);

  pushLogger.info(traceId, 'PushRequest', 'Received push request', {
    endpointId: (await params).id,
    isAsync,
    timeout,
    hasCallback: !!callbackUrl
  });

  try {
    const { id } = await params;

    const db = await getDb();
    const endpoint = await db.query.endpoints.findFirst({
      where: eq(endpoints.id, id),
      with: {
        channel: true
      }
    });

    // 端点不存在
    if (!endpoint || !endpoint.channel) {
      pushLogger.warn(traceId, 'PushRequest', 'Endpoint not found', {
        endpointId: id
      });
      return new Response(
        JSON.stringify(createPushResponse('failed', '接口不存在', traceId)),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 端点已禁用
    if (endpoint.status !== 'active') {
      pushLogger.warn(traceId, 'PushRequest', 'Endpoint is disabled', {
        endpointId: id
      });
      return new Response(
        JSON.stringify(createPushResponse('failed', '接口已禁用', traceId)),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    // 异步模式：立即返回 202，后台处理
    if (isAsync) {
      pushLogger.info(
        traceId,
        'PushRequest',
        'Async mode: returning 202 immediately'
      );

      // 后台执行推送和回调
      (async () => {
        try {
          const result = await executePush(endpoint, body, timeout, traceId);

          const status = result.success ? 'success' : 'failed';
          const message = result.success
            ? '推送成功'
            : result.error || '推送失败';
          const response = createPushResponse(status, message, traceId);

          pushLogger.info(
            traceId,
            'PushRequest',
            'Scheduling callback dispatch',
            {
              callbackUrl,
              callbackTimeout,
              status
            }
          );

          sendCallbackAsync(callbackUrl, response, traceId, callbackTimeout);
        } catch (error) {
          pushLogger.error(
            traceId,
            'PushRequest',
            'Background task error',
            error
          );
        }
      })();

      // 立即返回 202
      return new Response(
        JSON.stringify(
          createPushResponse('success', '请求已接受，正在处理中', traceId)
        ),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 同步模式：等待推送完成后返回
    const result = await executePush(endpoint, body, timeout, traceId);

    const message = result.success ? '推送成功' : result.error || '推送失败';
    const status = result.success
      ? 200
      : result.error === '推送超时'
        ? 504
        : 500;
    const responseStatus = result.success ? 'success' : 'failed';

    if (result.success) {
      pushLogger.info(
        traceId,
        'PushRequest',
        'Sync push completed successfully'
      );
    } else if (status === 504) {
      pushLogger.warn(traceId, 'PushRequest', 'Sync push timeout');
    } else {
      pushLogger.error(traceId, 'PushRequest', 'Sync push failed');
    }

    return new Response(
      JSON.stringify(createPushResponse(responseStatus, message, traceId)),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    pushLogger.error(traceId, 'PushRequest', 'Request handling error', error);
    return new Response(
      JSON.stringify(
        createPushResponse(
          'failed',
          error instanceof Error ? error.message : '推送失败',
          traceId
        )
      ),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
