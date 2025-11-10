/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    AUTH_SECRET: string;
    AUTH_GITHUB_ID: string;
    AUTH_GITHUB_SECRET: string;
    DISABLE_REGISTER: string;
    PUSH_TIMEOUT: string;
    PUSH_GROUP_CONCURRENCY: string;
    CALLBACK_TIMEOUT: string;
    LOG_LEVEL: string;
    LOG_DIR: string;
  }

  type Env = CloudflareEnv
}

declare module "next-auth" {
  interface User {
    username?: string | null
  }
  interface Session {
    user: User
  }
}

export type { Env }
