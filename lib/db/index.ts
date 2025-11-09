import { getRequestContext } from '@cloudflare/next-on-pages';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

let _db: DrizzleD1Database<typeof schema>;

export const getDb = () => {
  if (!_db) {
    _db = drizzle(getRequestContext().env.DB, { schema });
  }
  return _db;
};
