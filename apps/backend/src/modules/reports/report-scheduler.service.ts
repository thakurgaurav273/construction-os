import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReportSchedule } from '@prisma/client';
import { JobsService } from '../../common/jobs';
import { PrismaService } from '../../database/prisma.service';
import { ReportGenerationService } from './report-generation.service';
import { SCHEDULER_TICK_JOB, SCHEDULER_TICK_MS } from './reports.constants';
import { ScheduleFrequency, nextRunAfter } from './schedule-timing';

/** At most this many schedules start per tick, so a backlog after downtime can't flood the queue. */
const SCHEDULES_PER_TICK = 25;

const REPORT_WINDOW_DAYS: Record<ScheduleFrequency, number> = { ONCE: 30, DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

function isFrequency(value: string): value is ScheduleFrequency {
  return value in REPORT_WINDOW_DAYS;
}

/** The period a run covers: the frequency's window ending now, e.g. the last 7 days for a weekly report. */
export function scheduledPeriod(frequency: string, now: Date): { from: Date; to: Date } {
  const days = isFrequency(frequency) ? REPORT_WINDOW_DAYS[frequency] : REPORT_WINDOW_DAYS.ONCE;
  return { from: new Date(now.getTime() - days * 24 * 3600 * 1000), to: now };
}

/**
 * Once a minute, queues the reports whose schedules are due. Each schedule is claimed by moving its next run
 * forward in a conditional update, so two instances (or a slow tick) never produce the same run twice.
 */
@Injectable()
export class ReportSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly generation: ReportGenerationService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(SCHEDULER_TICK_JOB, async () => { await this.runDueSchedules(); });
    this.jobs.every(SCHEDULER_TICK_JOB, SCHEDULER_TICK_MS, {});
  }

  async runDueSchedules(now = new Date()): Promise<number> {
    const due = await this.prisma.reportSchedule.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: SCHEDULES_PER_TICK,
    });
    let started = 0;
    for (const schedule of due) {
      if (await this.claim(schedule, now)) {
        await this.start(schedule, now);
        started += 1;
      }
    }
    return started;
  }

  /** Runs a schedule immediately, without changing when it next runs on its own. */
  async runNow(schedule: ReportSchedule, userId: string): Promise<void> {
    await this.prisma.reportSchedule.update({ where: { id: schedule.id }, data: { lastRunAt: new Date(), lastStatus: 'GENERATING', lastError: null } });
    await this.start(schedule, new Date(), userId);
  }

  private async claim(schedule: ReportSchedule, now: Date): Promise<boolean> {
    const frequency = isFrequency(schedule.frequency) ? schedule.frequency : 'ONCE';
    const next = nextRunAfter(frequency, schedule.time, schedule.timezone, schedule.nextRunAt, now);
    const claimed = await this.prisma.reportSchedule.updateMany({
      where: { id: schedule.id, enabled: true, nextRunAt: schedule.nextRunAt },
      data: {
        nextRunAt: next ?? schedule.nextRunAt,
        // A one-off schedule switches itself off once it has run.
        enabled: next !== null,
        lastRunAt: now,
        lastStatus: 'GENERATING',
        lastError: null,
      },
    });
    return claimed.count === 1;
  }

  private async start(schedule: ReportSchedule, now: Date, userId = schedule.createdBy): Promise<void> {
    const period = scheduledPeriod(schedule.frequency, now);
    try {
      await this.generation.queue({
        organizationId: schedule.organizationId,
        userId,
        type: schedule.reportType,
        name: schedule.name,
        format: schedule.outputFormat,
        projectIds: schedule.projects,
        from: period.from,
        to: period.to,
        includeAiSummary: schedule.includeAiSummary,
        scheduleId: schedule.id,
      });
    } catch (error) {
      this.logger.error(`Couldn't start scheduled report ${schedule.id}`, error instanceof Error ? error.stack : String(error));
      await this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { lastStatus: 'FAILED', lastError: 'The report couldn’t be started. It will run again at the next scheduled time.' },
      });
    }
  }
}
