type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const config = {
  /** 推送超时时间（毫秒） */
  get PUSH_TIMEOUT(): number {
    return parseInt(process.env.PUSH_TIMEOUT || '10000', 10);
  },

  /** 推送组并发数 */
  get PUSH_GROUP_CONCURRENCY(): number {
    return parseInt(process.env.PUSH_GROUP_CONCURRENCY || '4', 10);
  },

  /** 回调超时时间（毫秒） */
  get CALLBACK_TIMEOUT(): number {
    return parseInt(process.env.CALLBACK_TIMEOUT || '10000', 10);
  },

  /** 日志级别 */
  get LOG_LEVEL(): LogLevel {
    return (process.env.LOG_LEVEL || 'debug').toLowerCase() as LogLevel;
  },

  /** 日志存储目录 */
  get LOG_DIR(): string {
    return process.env.LOG_DIR || './logs';
  },

  /** 认证密钥 */
  get AUTH_SECRET(): string {
    return process.env.AUTH_SECRET || '';
  },

  /** GitHub OAuth 客户端 ID */
  get AUTH_GITHUB_ID(): string {
    return process.env.AUTH_GITHUB_ID || '';
  },

  /** GitHub OAuth 客户端密钥 */
  get AUTH_GITHUB_SECRET(): string {
    return process.env.AUTH_GITHUB_SECRET || '';
  },

  /** 是否禁用注册 */
  get DISABLE_REGISTER(): boolean {
    return process.env.DISABLE_REGISTER === 'true';
  },

  /** Node 环境 */
  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }
};

export default config;

// 导出类型以便使用
export type { LogLevel };
