import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { endpoints } from '@/lib/db/schema/endpoints';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ENDPOINT_STATUS } from '@/lib/constants/endpoints';

export const runtime = 'edge';

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

    const endpoint = await db.query.endpoints.findFirst({
      where: and(
        eq(endpoints.id, endpointId),
        eq(endpoints.userId, session.user.id!)
      )
    });

    if (!endpoint) {
      return new NextResponse('Not found', { status: 404 });
    }

    const updated = await db
      .update(endpoints)
      .set({
        status:
          endpoint.status === ENDPOINT_STATUS.ACTIVE
            ? ENDPOINT_STATUS.INACTIVE
            : ENDPOINT_STATUS.ACTIVE
      })
      .where(eq(endpoints.id, endpointId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('[ENDPOINT_TOGGLE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
