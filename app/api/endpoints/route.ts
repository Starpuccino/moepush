import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  endpoints,
  insertEndpointSchema,
  NewEndpoint
} from '@/lib/db/schema/endpoints';
import { generateId } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';

export async function GET() {
  try {
    const db = await getDb();
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const endpointList = await db.query.endpoints.findMany({
      where: eq(endpoints.userId, session.user.id!),
      orderBy: (endpoints, { desc }) => [desc(endpoints.createdAt)]
    });

    return NextResponse.json(endpointList);
  } catch (error) {
    console.error('[ENDPOINTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const json = (await req.json()) as NewEndpoint;
    const body = insertEndpointSchema.parse({
      ...json,
      id: generateId(),
      userId: session.user.id!
    });

    const endpoint = await db
      .insert(endpoints)
      .values(body as any)
      .returning();

    return NextResponse.json(endpoint[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    console.error('[ENDPOINTS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
