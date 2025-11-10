import { sql } from 'drizzle-orm';
import { text, sqliteTable, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { channels } from './channels';

export const endpoints = sqliteTable(
  'endpoints',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'inactive'] })
      .notNull()
      .default('active'),
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    rule: text('rule').notNull()
  },
  (table) => ({
    userIdIdx: index('endpoints_user_id_idx').on(table.userId),
    channelIdIdx: index('endpoints_channel_id_idx').on(table.channelId)
  })
);

export const endpointsRelations = relations(endpoints, ({ one }) => ({
  channel: one(channels, {
    fields: [endpoints.channelId],
    references: [channels.id]
  })
}));

export const insertEndpointSchema = createInsertSchema(endpoints).extend({
  name: z.string().min(1, '名称不能为空').max(50, '名称不能超过50个字符'),
  userId: z.string().optional(),
  id: z.string().optional(),
  channelId: z.string().min(1, '请选择推送渠道'),
  rule: z.string().min(1, '消息模版不能为空')
});

export const selectEndpointSchema = createSelectSchema(endpoints);

export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = z.infer<typeof insertEndpointSchema>;
