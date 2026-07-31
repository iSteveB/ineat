import { toSafeUserResponse } from './auth-user-response';
import { AccessPolicyService } from './services/access-policy.service';

describe('toSafeUserResponse', () => {
  it('exposes billing fields needed by the subscription UX', () => {
    const response = toSafeUserResponse(
      {
        id: 'user-1',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        defaultServings: 4,
        primaryGoal: null,
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialStartedAt: new Date('2026-07-26T07:00:00.000Z'),
        trialEndsAt: new Date('2099-07-29T07:00:00.000Z'),
        trialUsedAt: new Date('2026-07-26T07:00:00.000Z'),
        currentPeriodStartedAt: new Date('2026-07-26T07:00:00.000Z'),
        currentPeriodEndsAt: new Date('2099-07-29T07:00:00.000Z'),
        billingInterval: null,
        cancelAtPeriodEnd: false,
        subscriptionCancelledAt: null,
        preferences: {},
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-26T07:00:00.000Z'),
      },
      new AccessPolicyService(),
    );

    expect(response).toMatchObject({
      subscriptionPlan: 'TRIAL',
      subscriptionStatus: 'ACTIVE',
      trialStartedAt: '2026-07-26T07:00:00.000Z',
      trialEndsAt: '2099-07-29T07:00:00.000Z',
      trialUsedAt: '2026-07-26T07:00:00.000Z',
      currentPeriodStartedAt: '2026-07-26T07:00:00.000Z',
      currentPeriodEndsAt: '2099-07-29T07:00:00.000Z',
      effectivePlan: 'PREMIUM',
      subscription: 'TRIAL',
    });
  });
});
