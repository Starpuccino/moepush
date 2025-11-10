import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { endpoints, insertEndpointSchema } from '@/lib/db/schema/endpoints';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateId } from '@/lib/utils';
import { z } from 'zod';
import { ENDPOINT_STATUS } from '@/lib/constants/endpoints';

export const runtime = 'edge';

const copyEndpointSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  status: z.enum([ENDPOINT_STATUS.ACTIVE, ENDPOINT_STATUS.INACTIVE]).optional()
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const db = await getDb();
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { endpointId } = await params;
    const body = await req.json();
    const { name, status } = copyEndpointSchema.parse(body);

    const originalEndpoint = await db.query.endpoints.findFirst({
      where: and(
        eq(endpoints.id, endpointId),
        eq(endpoints.userId, session.user.id!)
      )
    });

    if (!originalEndpoint) {
      return new NextResponse('Not found', { status: 404 });
    }

    const newEndpoint = insertEndpointSchema.parse({
      id: generateId(),
      name,
      channelId: originalEndpoint.channelId,
      rule: originalEndpoint.rule,
      userId: session.user.id!,
      status: status ?? ENDPOINT_STATUS.INACTIVE
    });

    const created = await db
      .insert(endpoints)
      .values(newEndpoint as any)
      .returning();

    return NextResponse.json(created[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    console.error('[ENDPOINT_COPY]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
