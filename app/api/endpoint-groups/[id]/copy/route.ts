import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  endpointGroups,
  endpointToGroup
} from '@/lib/db/schema/endpoint-groups';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils';
import { z } from 'zod';
import { ENDPOINT_STATUS } from '@/lib/constants/endpoints';

export const runtime = 'edge';

const copyEndpointGroupSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  status: z.enum([ENDPOINT_STATUS.ACTIVE, ENDPOINT_STATUS.INACTIVE]).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    const db = await getDb();
    const { id } = await params;

    const originalGroup = await db.query.endpointGroups.findFirst({
      where: and(
        eq(endpointGroups.id, id),
        eq(endpointGroups.userId, session!.user!.id!)
      )
    });

    if (!originalGroup) {
      return NextResponse.json(
        { error: '接口组不存在或无权访问' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, status } = copyEndpointGroupSchema.parse(body);

    const relations = await db.query.endpointToGroup.findMany({
      where: eq(endpointToGroup.groupId, id)
    });

    const newGroupId = generateId();

    await db.insert(endpointGroups).values({
      id: newGroupId,
      name,
      userId: session!.user!.id!,
      status: status ?? ENDPOINT_STATUS.INACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (relations.length > 0) {
      await db.insert(endpointToGroup).values(
        relations.map((relation) => ({
          endpointId: relation.endpointId,
          groupId: newGroupId
        }))
      );
    }

    return NextResponse.json({ id: newGroupId });
  } catch (error) {
    console.error('复制接口组失败:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '复制接口组失败' }, { status: 500 });
  }
}
