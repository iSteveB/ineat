import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../prisma/generated/prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TrialEmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrialEmailService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(
      () => void this.sendDueEmails(),
      this.getIntervalMs(),
    );
    this.timer.unref();
    setImmediate(() => void this.sendDueEmails());
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sendTrialStarted(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        trialEndsAt: true,
        trialStartedEmailSentAt: true,
      },
    });
    if (!user?.trialEndsAt || user.trialStartedEmailSentAt) return;
    await this.deliver(user, 'started');
  }

  async sendDueEmails(now = new Date()): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const reminderLimit = new Date(now.getTime() + REMINDER_WINDOW_MS);
      const [started, reminders, expired] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            subscriptionPlan: SubscriptionPlan.TRIAL,
            trialEndsAt: { gt: now },
            trialStartedEmailSentAt: null,
          },
          select: this.userSelect,
        }),
        this.prisma.user.findMany({
          where: {
            subscriptionPlan: SubscriptionPlan.TRIAL,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            trialEndsAt: { gt: now, lte: reminderLimit },
            trialReminderEmailSentAt: null,
          },
          select: this.userSelect,
        }),
        this.prisma.user.findMany({
          where: {
            subscriptionPlan: SubscriptionPlan.TRIAL,
            trialEndsAt: { lte: now },
            trialExpiredEmailSentAt: null,
          },
          select: this.userSelect,
        }),
      ]);

      await Promise.allSettled(
        started.map((user) => this.deliver(user, 'started')),
      );
      await Promise.allSettled(
        reminders.map((user) => this.deliver(user, 'reminder')),
      );
      await Promise.allSettled(
        expired.map((user) => this.expireAndDeliver(user)),
      );
    } finally {
      this.isRunning = false;
    }
  }

  private readonly userSelect = {
    id: true,
    email: true,
    firstName: true,
    trialEndsAt: true,
  } as const;

  private async expireAndDeliver(user: TrialUser): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: SubscriptionStatus.EXPIRED },
    });
    await this.deliver(user, 'expired');
  }

  private async deliver(
    user: TrialUser,
    kind: 'started' | 'reminder' | 'expired',
  ) {
    if (!user.trialEndsAt) return;
    const subscriptionUrl = `${(process.env.FRONTEND_URL || 'https://ineat.store').replace(/\/$/, '')}/app/subscription`;
    const input = {
      to: user.email,
      userId: user.id,
      firstName: user.firstName,
      trialEndsAt: user.trialEndsAt,
      subscriptionUrl,
    };

    try {
      if (kind === 'started') await this.email.sendTrialStarted(input);
      if (kind === 'reminder') await this.email.sendTrialReminder(input);
      if (kind === 'expired') await this.email.sendTrialExpired(input);
      await this.prisma.user.update({
        where: { id: user.id },
        data:
          kind === 'started'
            ? { trialStartedEmailSentAt: new Date() }
            : kind === 'reminder'
              ? { trialReminderEmailSentAt: new Date() }
              : { trialExpiredEmailSentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Trial ${kind} email failed for user ${user.id}`);
      throw error;
    }
  }

  private getIntervalMs(): number {
    const configured = Number(process.env.BILLING_EMAIL_INTERVAL_MS);
    return Number.isFinite(configured) && configured >= 60_000
      ? configured
      : DEFAULT_INTERVAL_MS;
  }
}

type TrialUser = {
  id: string;
  email: string;
  firstName: string;
  trialEndsAt: Date | null;
};
