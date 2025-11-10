/**
 * 推送响应类型定义
 * 定义单接口推送和接口组推送的响应格式
 */

/**
 * 单接口推送响应 (同步和异步回调格式相同)
 */
export interface PushResponse {
  status: 'success' | 'failed';
  message: string;
  type: 'push';
  traceId: string;
}

/**
 * 接口组推送中单个端点的详情
 */
export interface PushGroupDetail {
  endpointId: string;
  endpoint: string;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
}

/**
 * 接口组推送响应 (同步和异步回调格式相同)
 */
export interface PushGroupResponse {
  status: 'success' | 'partial' | 'failed';
  message: string;
  type: 'group';
  traceId: string;
  data: {
    total: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    details: PushGroupDetail[];
  };
}

/**
 * 通用响应类型
 */
export type PushResponseType = PushResponse | PushGroupResponse;

/**
 * 生成推送响应
 * @param status 状态
 * @param message 消息
 * @param traceId 追踪ID
 * @returns 推送响应
 */
export function createPushResponse(
  status: 'success' | 'failed',
  message: string,
  traceId: string
): PushResponse {
  return {
    status,
    message,
    type: 'push',
    traceId
  };
}

/**
 * 生成接口组推送响应
 * @param status 状态
 * @param message 消息
 * @param traceId 追踪ID
 * @param data 详情数据
 * @returns 接口组推送响应
 */
export function createPushGroupResponse(
  status: 'success' | 'partial' | 'failed',
  message: string,
  traceId: string,
  data: PushGroupResponse['data']
): PushGroupResponse {
  return {
    status,
    message,
    type: 'group',
    traceId,
    data
  };
}
