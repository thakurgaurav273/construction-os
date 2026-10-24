import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { redisConnectionFromUrl } from './redis-connection';

export interface JobMeta {
  jobId: string;
  attempt: number;
  /** No retry follows if this attempt throws, so handlers record the failure for people to see. */
  isLastAttempt: boolean;
}

export type JobHandler<T> = (data: T, meta: JobMeta) => Promise<void>;

export interface EnqueueOptions {
  /** Same id while a job is pending means the second enqueue is ignored, e.g. one run per schedule slot. No colons (BullMQ reserves them). */
  jobId?: string;
  delayMs?: number;
  attempts?: number;
}

const QUEUE_NAME = 'sitepilot';
const DEFAULT_ATTEMPTS = 3;
const BACKOFF_MS = 5_000;
const WORKER_CONCURRENCY = 4;

interface Registered {
  handler: JobHandler<unknown>;
}

interface Recurring {
  name: string;
  intervalMs: number;
  data: unknown;
}

/**
 * Background work (reports, emails, AI analysis) runs here rather than inside a request. With REDIS_URL set,
 * jobs go through a BullMQ queue with retries and survive restarts; without it (local development, tests)
 * they run in-process, so nothing depends on Redis being up. Feature modules only see `register`,
 * `enqueue` and `every`, so the queue can change without touching them.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  private readonly handlers = new Map<string, Registered>();
  private readonly redisUrl: string | undefined;
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly recurring: Recurring[] = [];
  private readonly inlineRunning = new Set<string>();

  constructor(config: ConfigService) {
    this.redisUrl = config.get<string>('REDIS_URL')?.trim() || undefined;
  }

  get mode(): 'redis' | 'inline' {
    return this.queue ? 'redis' : 'inline';
  }

  /** Called from feature services' onModuleInit; the worker starts once every module has registered. */
  register<T>(name: string, handler: JobHandler<T>): void {
    if (this.handlers.has(name)) throw new Error(`Job ${name} is already registered.`);
    this.handlers.set(name, { handler: handler as JobHandler<unknown> });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn('REDIS_URL is not set: background jobs run in-process and are lost on restart.');
      for (const job of this.recurring) {
        this.timers.push(setInterval(() => this.runInline(job.name, job.data, { jobId: `${job.name}:tick`, attempts: 1 }), job.intervalMs));
      }
      return;
    }
    const connection = redisConnectionFromUrl(this.redisUrl);
    this.queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: { type: 'exponential', delay: BACKOFF_MS },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
    this.worker = new Worker(QUEUE_NAME, (job) => this.process(job), { connection, concurrency: WORKER_CONCURRENCY });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.name} (${job?.id}) failed on attempt ${job?.attemptsMade}: ${error.message}`);
    });
    this.worker.on('error', (error) => this.logger.error(`Job worker error: ${error.message}`));
    for (const job of this.recurring) {
      await this.queue.upsertJobScheduler(job.name, { every: job.intervalMs }, { name: job.name, data: job.data, opts: { attempts: 1 } });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.timers.forEach(clearInterval);
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue<T>(name: string, data: T, options: EnqueueOptions = {}): Promise<void> {
    if (!this.handlers.has(name)) throw new Error(`No handler is registered for job ${name}.`);
    if (options.jobId?.includes(':')) throw new Error(`Job id ${options.jobId} can't contain ":".`);
    if (this.queue) {
      try {
        await this.queue.add(name, data, {
          jobId: options.jobId,
          delay: options.delayMs,
          attempts: options.attempts ?? DEFAULT_ATTEMPTS,
        });
        return;
      } catch (error) {
        // A queue outage shouldn't lose the work: run it here instead.
        this.logger.error(`Couldn't queue ${name}, running it in-process: ${error instanceof Error ? error.message : error}`);
      }
    }
    this.runInline(name, data, options);
  }

  /**
   * A job that runs on a fixed interval, e.g. the report scheduler's tick; declared from onModuleInit and
   * started at bootstrap. With Redis, one scheduler is shared by every instance, so it fires once per interval.
   */
  every<T>(name: string, intervalMs: number, data: T): void {
    if (!this.handlers.has(name)) throw new Error(`No handler is registered for job ${name}.`);
    this.recurring.push({ name, intervalMs, data });
  }

  private async process(job: Job): Promise<void> {
    const registered = this.handlers.get(job.name);
    if (!registered) throw new Error(`No handler is registered for job ${job.name}.`);
    const attempt = job.attemptsMade + 1;
    await registered.handler(job.data, { jobId: String(job.id), attempt, isLastAttempt: attempt >= (job.opts.attempts ?? 1) });
  }

  private runInline<T>(name: string, data: T, options: EnqueueOptions): void {
    const jobId = options.jobId ?? `${name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    if (this.inlineRunning.has(jobId)) return;
    this.inlineRunning.add(jobId);
    const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
    const run = async (attempt: number): Promise<void> => {
      try {
        await this.handlers.get(name)?.handler(data, { jobId, attempt, isLastAttempt: attempt >= attempts });
        this.inlineRunning.delete(jobId);
      } catch (error) {
        this.logger.error(`Job ${name} (${jobId}) failed on attempt ${attempt}: ${error instanceof Error ? error.message : error}`);
        if (attempt < attempts) setTimeout(() => { void run(attempt + 1); }, BACKOFF_MS * 2 ** (attempt - 1));
        else this.inlineRunning.delete(jobId);
      }
    };
    setTimeout(() => { void run(1); }, options.delayMs ?? 0);
  }
}
