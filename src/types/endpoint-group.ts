import { Endpoint } from '@/lib/db/schema/endpoints';
import { EndpointStatus } from '@/lib/constants/endpoints';

export interface EndpointGroup {
  id: string;
  name: string;
  userId: string;
  status: EndpointStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EndpointGroupWithEndpoints extends EndpointGroup {
  endpointIds: string[];
  endpoints: Endpoint[];
}
