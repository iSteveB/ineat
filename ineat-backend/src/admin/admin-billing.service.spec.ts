import { BadRequestException } from '@nestjs/common';
import { AdminBillingService } from './admin-billing.service';
import {
  AdminDiscountDuration,
  AdminDiscountType,
} from './dto/admin-billing.dto';

describe('AdminBillingService', () => {
  const actor = { userId: 'admin-1', sessionId: 'session-1' };
  let prisma: { user: { findUnique: jest.Mock } };
  let stripe: {
    coupons: { create: jest.Mock; del: jest.Mock };
    promotionCodes: {
      list: jest.Mock;
      create: jest.Mock;
      retrieve: jest.Mock;
      update: jest.Mock;
    };
    subscriptions: { retrieve: jest.Mock; update: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let service: AdminBillingService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    stripe = {
      coupons: {
        create: jest.fn().mockResolvedValue({ id: 'coupon-1' }),
        del: jest.fn().mockResolvedValue({ deleted: true }),
      },
      promotionCodes: {
        list: jest.fn().mockResolvedValue({ data: [] }),
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      subscriptions: { retrieve: jest.fn(), update: jest.fn() },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AdminBillingService(
      prisma as never,
      { getClient: () => stripe } as never,
      audit as never,
    );
  });

  it('crée le coupon et le code promotionnel dans Stripe puis audite', async () => {
    stripe.promotionCodes.create.mockResolvedValue({
      id: 'promo-1',
      code: 'WELCOME20',
      active: true,
      created: 1785400000,
      expires_at: null,
      max_redemptions: 100,
      times_redeemed: 0,
      customer: null,
      promotion: { type: 'coupon', coupon: 'coupon-1' },
    });

    await service.createPromotionCode(
      {
        code: 'welcome20',
        name: 'Bienvenue',
        discountType: AdminDiscountType.PERCENT,
        percentOff: 20,
        duration: AdminDiscountDuration.ONCE,
        maxRedemptions: 100,
        firstTimeOnly: true,
        reason: 'Campagne de lancement',
      },
      actor,
    );

    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({ percent_off: 20, duration: 'once' }),
    );
    expect(stripe.promotionCodes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'WELCOME20',
        promotion: { type: 'coupon', coupon: 'coupon-1' },
        max_redemptions: 100,
        restrictions: { first_time_transaction: true },
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STRIPE_PROMOTION_CODE_CREATED',
        resourceId: 'promo-1',
        reason: 'Campagne de lancement',
      }),
    );
  });

  it('supprime le coupon créé si le code promotionnel échoue', async () => {
    stripe.promotionCodes.create.mockRejectedValue(new Error('duplicate code'));

    await expect(
      service.createPromotionCode(
        {
          code: 'WELCOME20',
          name: 'Bienvenue',
          discountType: AdminDiscountType.FIXED,
          amountOff: 500,
          duration: AdminDiscountDuration.ONCE,
          firstTimeOnly: false,
          reason: 'Campagne de lancement',
        },
        actor,
      ),
    ).rejects.toThrow('duplicate code');

    expect(stripe.coupons.del).toHaveBeenCalledWith('coupon-1');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('programme une annulation Stripe sans modifier le plan en base', async () => {
    prisma.user.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub-1' });
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      cancel_at_period_end: false,
    });
    stripe.subscriptions.update.mockResolvedValue({
      id: 'sub-1',
      cancel_at_period_end: true,
    });

    await service.setCancellationAtPeriodEnd(
      'user-1',
      true,
      'Demande confirmée par le client',
      actor,
    );

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub-1', {
      cancel_at_period_end: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STRIPE_SUBSCRIPTION_CANCELLATION_SCHEDULED',
      }),
    );
  });

  it('refuse de réactiver un abonnement déjà terminé', async () => {
    prisma.user.findUnique.mockResolvedValue({ stripeSubscriptionId: 'sub-1' });
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub-1',
      status: 'canceled',
      cancel_at_period_end: false,
    });

    await expect(
      service.setCancellationAtPeriodEnd(
        'user-1',
        false,
        'Demande client',
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });
});
