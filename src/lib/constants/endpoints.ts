export const ENDPOINT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type EndpointStatus =
  (typeof ENDPOINT_STATUS)[keyof typeof ENDPOINT_STATUS];

export const STATUS_LABELS: Record<EndpointStatus, string> = {
  [ENDPOINT_STATUS.ACTIVE]: '启用',
  [ENDPOINT_STATUS.INACTIVE]: '禁用'
};
