/**
 * 推送日志服务
 * 提供结构化日志记录，支持 traceId 追踪
 */

import { DEFAULT_LOG_LEVEL } from '../constants/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  traceId: string;
  operation: string;
  message: string;
  data?: any;
  error?: string;
}

class PushLogger {
  private logLevel: LogLevel = DEFAULT_LOG_LEVEL;

  constructor() {
    // 从环境变量读取日志级别（不区分大小写，默认为 debug）
    const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    if (level && ['debug', 'info', 'warn', 'error'].includes(level)) {
      this.logLevel = level;
    }
  }

  /**
   * 判断是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  /**
   * 格式化日志条目
   */
  private formatLog(entry: LogEntry): string {
    const { timestamp, level, traceId, operation, message, data } = entry;
    const levelStr = level.toUpperCase().padEnd(5);
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    const errorStr = entry.error ? ` Error: ${entry.error}` : '';

    return `[${timestamp}] [${levelStr}] [${traceId}] ${operation}: ${message}${dataStr}${errorStr}`;
  }

  /**
   * 输出日志
   */
  private output(entry: LogEntry): void {
    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * 记录调试日志
   */
  debug(traceId: string, operation: string, message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'debug',
        traceId,
        operation,
        message,
        data
      });
    }
  }

  /**
   * 记录信息日志
   */
  info(traceId: string, operation: string, message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'info',
        traceId,
        operation,
        message,
        data
      });
    }
  }

  /**
   * 记录警告日志
   */
  warn(traceId: string, operation: string, message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'warn',
        traceId,
        operation,
        message,
        data
      });
    }
  }

  /**
   * 记录错误日志
   */
  error(
    traceId: string,
    operation: string,
    message: string,
    error?: any
  ): void {
    if (this.shouldLog('error')) {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'error',
        traceId,
        operation,
        message,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// 导出单例
export const pushLogger = new PushLogger();
