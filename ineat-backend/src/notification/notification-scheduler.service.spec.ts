import { NotificationSchedulerService } from './notification-scheduler.service';

describe('NotificationSchedulerService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
    },
  };
  const notifications = {
    synchronizeUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('synchronizes users in bounded batches and isolates user failures', async () => {
    const firstBatch = Array.from({ length: 100 }, (_, index) => ({
      id: `user-${index.toString().padStart(3, '0')}`,
    }));
    prisma.user.findMany
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce([{ id: 'user-100' }]);
    notifications.synchronizeUser.mockImplementation((userId: string) =>
      userId === 'user-050'
        ? Promise.reject(new Error('sync failed'))
        : Promise.resolve(),
    );
    const service = new NotificationSchedulerService(
      prisma as any,
      notifications as any,
    );

    await service.synchronizeAllUsers();

    expect(notifications.synchronizeUser).toHaveBeenCalledTimes(101);
    expect(prisma.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { id: 'user-099' },
        skip: 1,
        take: 100,
      }),
    );
  });

  it('does not overlap two synchronization runs', async () => {
    let releaseQuery: () => void = () => undefined;
    prisma.user.findMany.mockReturnValue(
      new Promise<Array<{ id: string }>>((resolve) => {
        releaseQuery = () => resolve([]);
      }),
    );
    const service = new NotificationSchedulerService(
      prisma as any,
      notifications as any,
    );

    const firstRun = service.synchronizeAllUsers();
    await service.synchronizeAllUsers();
    releaseQuery();
    await firstRun;

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });
});
