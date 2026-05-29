import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  let service: ObservabilityService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    service = new ObservabilityService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sanitizes sensitive context and exposes recent events', () => {
    service.trackEvent('auth.test', 'warn', 'Test event', {
      userId: 'user-1',
      password: 'secret-password',
      authorization: 'Bearer token',
    });

    const snapshot = service.getSnapshot();

    expect(snapshot.counters).toMatchObject({
      'events.warn': 1,
    });
    expect(snapshot.recentEvents[0]).toMatchObject({
      name: 'auth.test',
      severity: 'warn',
      context: {
        userId: 'user-1',
        password: '[redacted]',
        authorization: '[redacted]',
      },
    });
  });

  it('summarizes timing samples', () => {
    service.recordTiming('inventory.import.duration_ms', 100, {
      importId: 'import-1',
    });
    service.recordTiming('inventory.import.duration_ms', 300, {
      importId: 'import-2',
    });

    expect(service.getSnapshot().timings).toMatchObject({
      'inventory.import.duration_ms': {
        count: 2,
        minMs: 100,
        maxMs: 300,
        avgMs: 200,
        lastMs: 300,
        lastContext: {
          importId: 'import-2',
        },
      },
    });
  });
});
