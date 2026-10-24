import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  const cloudinary = {
    config: jest.fn().mockReturnValue({ cloud_name: 'ineat-cloud' }),
  };
  const service = new CloudinaryService(cloudinary as never, {} as never);

  describe('extractManagedImagePublicId', () => {
    it('extracts an image public id from the configured cloud', () => {
      expect(
        service.extractManagedImagePublicId(
          'https://res.cloudinary.com/ineat-cloud/image/upload/v123/avatars/user-1/avatar.jpg',
        ),
      ).toBe('avatars/user-1/avatar');
    });

    it.each([
      'https://example.com/ineat-cloud/image/upload/v1/avatars/user-1/avatar.jpg',
      'https://res.cloudinary.com/another-cloud/image/upload/v1/avatars/user-1/avatar.jpg',
      'http://res.cloudinary.com/ineat-cloud/image/upload/v1/avatars/user-1/avatar.jpg',
    ])('rejects an unmanaged image URL: %s', (url) => {
      expect(() => service.extractManagedImagePublicId(url)).toThrow(
        BadRequestException,
      );
    });
  });
});
