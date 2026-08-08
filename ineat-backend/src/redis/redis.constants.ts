export const REDIS_PRODUCER = Symbol('REDIS_PRODUCER');
export const REDIS_WORKER = Symbol('REDIS_WORKER');

export const QUEUE_NAMES = {
  invoiceAnalysis: 'invoice-analysis',
  notificationsSync: 'notifications-sync',
  notificationDelivery: 'notification-delivery',
  dailyDigest: 'daily-digest',
  weeklyDigest: 'weekly-digest',
  notificationMaintenance: 'notification-maintenance',
  system: 'system',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
