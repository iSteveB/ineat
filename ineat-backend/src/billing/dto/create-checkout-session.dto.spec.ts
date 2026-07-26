import { validate } from 'class-validator';
import {
  BillingInterval,
  CreateCheckoutSessionDto,
} from './create-checkout-session.dto';

describe('CreateCheckoutSessionDto', () => {
  it.each([BillingInterval.MONTHLY, BillingInterval.YEARLY])(
    'accepts the %s billing interval',
    async (interval) => {
      const dto = new CreateCheckoutSessionDto();
      dto.interval = interval;

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rejects arbitrary Stripe Price IDs', async () => {
    const dto = new CreateCheckoutSessionDto();
    dto.interval = 'price_attacker' as BillingInterval;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('interval');
  });
});
