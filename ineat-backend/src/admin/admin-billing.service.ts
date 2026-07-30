import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeClientFactory } from '../billing/stripe-client.factory';
import { AdminAuditService, AdminActorContext } from './admin-audit.service';
import {
  AdminDiscountDuration,
  AdminDiscountType,
  CreatePromotionCodeDto,
} from './dto/admin-billing.dto';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClientFactory: StripeClientFactory,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async listPromotionCodes() {
    const stripe = this.stripeClientFactory.getClient();
    const result = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.promotion.coupon'],
    });
    return {
      success: true,
      data: result.data.map((promotionCode) =>
        this.toPromotionCode(promotionCode),
      ),
    };
  }

  async createPromotionCode(
    dto: CreatePromotionCodeDto,
    actor: AdminActorContext,
  ) {
    const stripe = this.stripeClientFactory.getClient();
    const coupon = await stripe.coupons.create({
      name: dto.name.trim(),
      ...(dto.discountType === AdminDiscountType.PERCENT
        ? { percent_off: dto.percentOff }
        : { amount_off: dto.amountOff, currency: 'eur' }),
      duration:
        dto.duration.toLowerCase() as Stripe.CouponCreateParams.Duration,
      ...(dto.duration === AdminDiscountDuration.REPEATING
        ? { duration_in_months: dto.durationInMonths }
        : {}),
      metadata: { createdBy: actor.userId, source: 'ineat-admin' },
    });
    let promotionCode: Stripe.PromotionCode;
    try {
      promotionCode = await stripe.promotionCodes.create({
        code: dto.code.trim().toUpperCase(),
        promotion: { type: 'coupon', coupon: coupon.id },
        ...(dto.expiresAt
          ? { expires_at: Math.floor(new Date(dto.expiresAt).getTime() / 1000) }
          : {}),
        ...(dto.maxRedemptions ? { max_redemptions: dto.maxRedemptions } : {}),
        ...(dto.stripeCustomerId
          ? { customer: dto.stripeCustomerId.trim() }
          : {}),
        restrictions: { first_time_transaction: dto.firstTimeOnly },
        metadata: { createdBy: actor.userId, source: 'ineat-admin' },
      });
    } catch (error) {
      await stripe.coupons.del(coupon.id).catch(() => undefined);
      throw error;
    }
    await this.adminAuditService.record({
      ...actor,
      action: 'STRIPE_PROMOTION_CODE_CREATED',
      resourceType: 'STRIPE_PROMOTION_CODE',
      resourceId: promotionCode.id,
      newValue: {
        code: promotionCode.code,
        couponId: coupon.id,
        discountType: dto.discountType,
        percentOff: dto.percentOff ?? null,
        amountOff: dto.amountOff ?? null,
        duration: dto.duration,
        expiresAt: dto.expiresAt ?? null,
        maxRedemptions: dto.maxRedemptions ?? null,
        firstTimeOnly: dto.firstTimeOnly,
        customerRestricted: Boolean(dto.stripeCustomerId),
      },
      reason: dto.reason,
    });
    return { success: true, data: this.toPromotionCode(promotionCode) };
  }

  async deactivatePromotionCode(
    promotionCodeId: string,
    reason: string,
    actor: AdminActorContext,
  ) {
    const stripe = this.stripeClientFactory.getClient();
    const previous = await stripe.promotionCodes.retrieve(promotionCodeId);
    if (!previous.active) {
      throw new BadRequestException('Ce code promotionnel est déjà inactif');
    }
    const promotionCode = await stripe.promotionCodes.update(promotionCodeId, {
      active: false,
    });
    await this.adminAuditService.record({
      ...actor,
      action: 'STRIPE_PROMOTION_CODE_DEACTIVATED',
      resourceType: 'STRIPE_PROMOTION_CODE',
      resourceId: promotionCode.id,
      previousValue: { active: true },
      newValue: { active: false },
      reason,
    });
    return { success: true, data: this.toPromotionCode(promotionCode) };
  }

  async setCancellationAtPeriodEnd(
    userId: string,
    cancelAtPeriodEnd: boolean,
    reason: string,
    actor: AdminActorContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!user.stripeSubscriptionId) {
      throw new BadRequestException(
        "Aucun abonnement Stripe n'est associé à ce compte",
      );
    }
    const stripe = this.stripeClientFactory.getClient();
    const previous = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );
    if (previous.status === 'canceled') {
      throw new BadRequestException(
        'Un abonnement terminé ne peut pas être réactivé',
      );
    }
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: cancelAtPeriodEnd },
    );
    await this.adminAuditService.record({
      ...actor,
      action: cancelAtPeriodEnd
        ? 'STRIPE_SUBSCRIPTION_CANCELLATION_SCHEDULED'
        : 'STRIPE_SUBSCRIPTION_CANCELLATION_REVOKED',
      resourceType: 'STRIPE_SUBSCRIPTION',
      resourceId: subscription.id,
      previousValue: { cancelAtPeriodEnd: previous.cancel_at_period_end },
      newValue: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        userId,
      },
      reason,
    });
    return {
      success: true,
      data: {
        id: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    };
  }

  private toPromotionCode(promotionCode: Stripe.PromotionCode) {
    const coupon =
      promotionCode.promotion.type === 'coupon' &&
      typeof promotionCode.promotion.coupon !== 'string'
        ? promotionCode.promotion.coupon
        : null;
    return {
      id: promotionCode.id,
      code: promotionCode.code,
      active: promotionCode.active,
      createdAt: new Date(promotionCode.created * 1000).toISOString(),
      expiresAt: promotionCode.expires_at
        ? new Date(promotionCode.expires_at * 1000).toISOString()
        : null,
      maxRedemptions: promotionCode.max_redemptions,
      timesRedeemed: promotionCode.times_redeemed,
      customerId:
        typeof promotionCode.customer === 'string'
          ? promotionCode.customer
          : (promotionCode.customer?.id ?? null),
      couponId:
        promotionCode.promotion.type === 'coupon'
          ? typeof promotionCode.promotion.coupon === 'string'
            ? promotionCode.promotion.coupon
            : promotionCode.promotion.coupon.id
          : null,
      name: coupon?.name ?? null,
      percentOff: coupon?.percent_off ?? null,
      amountOff: coupon?.amount_off ?? null,
      currency: coupon?.currency ?? null,
      duration: coupon?.duration ?? null,
      durationInMonths: coupon?.duration_in_months ?? null,
    };
  }
}
