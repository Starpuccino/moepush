import { EndpointGroupWithEndpoints } from '@/types/endpoint-group';
import { generateExampleBody } from '@/lib/generator';
import { EndpointStatus, ENDPOINT_STATUS } from '@/lib/constants/endpoints';

const API_URL = '/api/endpoint-groups';

interface EndpointGroupResponse {
  id: string;
  name: string;
  userId: string;
  status: EndpointStatus;
  createdAt: string;
  updatedAt: string;
  endpointIds: string[];
  endpoints: any[];
}

interface ToggleEndpointGroupResponse extends EndpointGroupResponse {
  status: EndpointStatus;
}

export async function getEndpointGroups(): Promise<
  EndpointGroupWithEndpoints[]
> {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '获取接口组失败');
  }
  const data = (await response.json()) as EndpointGroupResponse[];
  return data.map((group) => ({
    ...group,
    createdAt: new Date(group.createdAt),
    updatedAt: new Date(group.updatedAt)
  }));
}

export interface CreateEndpointGroupData {
  name: string;
  endpointIds: string[];
}

export async function createEndpointGroup(
  data: CreateEndpointGroupData
): Promise<{ id: string }> {
  if (!data.endpointIds.length) {
    throw new Error('请至少选择一个接口');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...data
    })
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '创建接口组失败');
  }

  return response.json() as Promise<{ id: string }>;
}

export interface UpdateEndpointGroupData {
  name: string;
  endpointIds: string[];
}

export async function updateEndpointGroup(
  id: string,
  data: UpdateEndpointGroupData
): Promise<{ success: boolean }> {
  if (!data.endpointIds.length) {
    throw new Error('请至少选择一个接口');
  }

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '更新接口组失败');
  }

  return response.json() as Promise<{ success: boolean }>;
}

export async function deleteEndpointGroup(
  id: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '删除接口组失败');
  }

  return response.json() as Promise<{ success: boolean }>;
}

export async function toggleEndpointGroupStatus(
  id: string
): Promise<EndpointGroupWithEndpoints> {
  const response = await fetch(`${API_URL}/${id}/toggle`, {
    method: 'POST'
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '切换状态失败');
  }

  const data = (await response.json()) as ToggleEndpointGroupResponse;
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    endpointIds: data.endpointIds,
    endpoints: data.endpoints
  };
}

export async function testEndpointGroup(
  group: EndpointGroupWithEndpoints,
  customData?: any
): Promise<any> {
  // 使用所有接口中的规则生成测试数据
  const allRules = group.endpoints.flatMap((e) => (e.rule ? [e.rule] : []));
  const exampleBody =
    customData ||
    generateExampleBody(allRules.length > 0 ? allRules.join('\n') : '{}');

  const response = await fetch(`/api/push-group/${group.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(exampleBody)
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '测试推送失败');
  }

  return response.json();
}

export async function copyEndpointGroup(
  id: string,
  name: string,
  status: EndpointStatus = ENDPOINT_STATUS.INACTIVE
): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/${id}/copy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, status })
  });

  if (!response.ok) {
    const error = (await response.json()) as { error: string };
    throw new Error(error.error || '复制接口组失败');
  }

  return response.json() as Promise<{ id: string }>;
}
