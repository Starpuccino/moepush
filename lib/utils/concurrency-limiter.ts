/**
 * 并发限制器
 * 用于控制异步操作的最大并发数量，超出部分会排队等待。
 */

export class ConcurrencyLimiter {
  private readonly concurrency: number;
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = Math.max(1, concurrency);
  }

  private dequeue(): void {
    // 当正在运行的任务数未达到上限时，取出队列中的下一个任务执行
    if (this.running >= this.concurrency) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) {
      return;
    }

    this.running++;
    nextTask();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const runTask = () => {
        // 将任务包装成微任务，统一处理 resolve/reject 逻辑
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            // 当前任务完成后，释放占用并尝试启动队列中的下一个任务
            this.running--;
            this.dequeue();
          });
      };

      if (this.running < this.concurrency) {
        // 尚未触及并发上限，直接执行
        this.running++;
        runTask();
      } else {
        // 已达到上限，加入队列等待
        this.queue.push(runTask);
      }
    });
  }

  async runAll<T>(
    tasks: Array<() => Promise<T>>
  ): Promise<PromiseSettledResult<T>[]> {
    // 对给定任务数组执行并发管理，返回每个任务的执行结果
    return Promise.allSettled(tasks.map((task) => this.run(task)));
  }
}
