import { BadRequestException } from '@nestjs/common';
import { ResendWebhookController } from './resend-webhook.controller';

describe('ResendWebhookController', () => {
  const process = jest.fn();
  const controller = new ResendWebhookController({ process } as never);

  beforeEach(() => jest.clearAllMocks());

  it('forwards the untouched payload and Svix headers', async () => {
    process.mockResolvedValue({ received: true, duplicate: false });
    const rawBody = Buffer.from('{"type":"email.delivered"}');

    await expect(
      controller.process(
        { rawBody } as never,
        'msg_123',
        '1234567890',
        'v1,signature',
      ),
    ).resolves.toEqual({ received: true, duplicate: false });

    expect(process).toHaveBeenCalledWith(rawBody.toString('utf8'), {
      id: 'msg_123',
      timestamp: '1234567890',
      signature: 'v1,signature',
    });
  });

  it('rejects requests without a complete signature', () => {
    expect(() =>
      controller.process({ rawBody: Buffer.from('{}') } as never),
    ).toThrow(BadRequestException);
    expect(process).not.toHaveBeenCalled();
  });
});
