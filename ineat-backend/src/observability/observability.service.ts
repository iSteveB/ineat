import { Injectable, Logger } from '@nestjs/common';

export type EventSeverity = 'info' | 'warn' | 'error';

export interface ObservabilityEvent {
  id: string;
  name: string;
  severity: EventSeverity;
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
}

export interface TimingSample {
  metric: string;
  durationMs: number;
  context: Record<string, unknown>;
  timestamp: string;
}

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|apikey|api_key|key|hash)/i;

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private readonly counters = new Map<string, number>();
  private readonly timings = new Map<string, TimingSample[]>();
  private readonly recentEvents: ObservabilityEvent[] = [];
  private readonly maxRecentEvents = 50;
  private readonly maxTimingSamples = 100;

  increment(metric: string, value = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + value);
  }

  recordTiming(
    metric: string,
    durationMs: number,
    context: Record<string, unknown> = {},
  ): void {
    const sample: TimingSample = {
      metric,
      durationMs,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    };

    const samples = this.timings.get(metric) ?? [];
    samples.push(sample);
    if (samples.length > this.maxTimingSamples) {
      samples.shift();
    }
    this.timings.set(metric, samples);
  }

  trackEvent(
    name: string,
    severity: EventSeverity,
    message: string,
    context: Record<string, unknown> = {},
  ): void {
    const event: ObservabilityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name,
      severity,
      message,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop();
    }

    this.increment(`events.${severity}`);

    const serialized = JSON.stringify({
      event: event.name,
      severity: event.severity,
      message: event.message,
      context: event.context,
      timestamp: event.timestamp,
    });

    if (severity === 'error') {
      this.logger.error(serialized);
      return;
    }

    if (severity === 'warn') {
      this.logger.warn(serialized);
      return;
    }

    this.logger.log(serialized);
  }

  getSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      counters: Object.fromEntries(this.counters.entries()),
      timings: Object.fromEntries(
        Array.from(this.timings.entries()).map(([metric, samples]) => [
          metric,
          this.summarizeTiming(samples),
        ]),
      ),
      recentEvents: this.recentEvents,
    };
  }

  private summarizeTiming(samples: TimingSample[]) {
    const durations = samples.map((sample) => sample.durationMs);
    const count = durations.length;

    if (count === 0) {
      return {
        count: 0,
        minMs: 0,
        maxMs: 0,
        avgMs: 0,
        lastMs: 0,
      };
    }

    const total = durations.reduce((sum, value) => sum + value, 0);

    return {
      count,
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      avgMs: Math.round(total / count),
      lastMs: durations[durations.length - 1],
      lastContext: samples[samples.length - 1].context,
      lastAt: samples[samples.length - 1].timestamp,
    };
  }

  private sanitizeContext(
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(context).map(([key, value]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, '[redacted]'];
        }

        if (value instanceof Error) {
          return [key, value.message];
        }

        if (typeof value === 'string' && value.length > 500) {
          return [key, `${value.slice(0, 500)}...`];
        }

        return [key, value];
      }),
    );
  }
}
