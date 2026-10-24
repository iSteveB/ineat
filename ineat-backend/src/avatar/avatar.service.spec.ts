import { BadRequestException } from '@nestjs/common';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const cloudinaryService = {
    extractManagedImagePublicId: jest.fn(),
    extractPublicId: jest.fn(),
    deleteImage: jest.fn(),
  };
  let service: AvatarService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AvatarService(prisma as never, cloudinaryService as never);
  });

  it('persists the new avatar before deleting the previous image', async () => {
    const newAvatarUrl =
      'https://res.cloudinary.com/ineat/image/upload/v1/avatars/user-1/new.jpg';
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      avatarUrl:
        'https://res.cloudinary.com/ineat/image/upload/v1/avatars/user-1/old.jpg',
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      avatarUrl: newAvatarUrl,
    });
    cloudinaryService.extractManagedImagePublicId.mockReturnValue(
      'avatars/user-1/new',
    );
    cloudinaryService.extractPublicId.mockReturnValue('avatars/user-1/old');
    cloudinaryService.deleteImage.mockResolvedValue({ result: 'ok' });

    await service.updateAvatar('user-1', { avatarUrl: newAvatarUrl });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: newAvatarUrl },
      select: { id: true, avatarUrl: true },
    });
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(
      'avatars/user-1/old',
    );
    expect(prisma.user.update.mock.invocationCallOrder[0]).toBeLessThan(
      cloudinaryService.deleteImage.mock.invocationCallOrder[0],
    );
  });

  it("rejects an avatar outside the user's Cloudinary folder", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', avatarUrl: null });
    cloudinaryService.extractManagedImagePublicId.mockReturnValue(
      'avatars/user-2/avatar',
    );

    await expect(
      service.updateAvatar('user-1', {
        avatarUrl:
          'https://res.cloudinary.com/ineat/image/upload/v1/avatars/user-2/avatar.jpg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });

  it('keeps the new avatar when deletion of the previous image fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    const newAvatarUrl =
      'https://res.cloudinary.com/ineat/image/upload/v1/avatars/user-1/new.jpg';
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      avatarUrl:
        'https://res.cloudinary.com/ineat/image/upload/v1/avatars/user-1/old.jpg',
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      avatarUrl: newAvatarUrl,
    });
    cloudinaryService.extractManagedImagePublicId.mockReturnValue(
      'avatars/user-1/new',
    );
    cloudinaryService.extractPublicId.mockReturnValue('avatars/user-1/old');
    cloudinaryService.deleteImage.mockRejectedValue(new Error('Cloudinary down'));

    await expect(
      service.updateAvatar('user-1', { avatarUrl: newAvatarUrl }),
    ).resolves.toMatchObject({ avatarUrl: newAvatarUrl });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
