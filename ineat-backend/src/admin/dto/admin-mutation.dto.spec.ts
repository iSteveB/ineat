import { validate } from 'class-validator';
import { UserRole } from '../../../prisma/generated/prisma/enums';
import { UpdateRoleDto } from './admin-mutation.dto';

describe('UpdateRoleDto', () => {
  it('accepte un rôle et une justification valides', async () => {
    const dto = new UpdateRoleDto();
    dto.role = UserRole.ADMIN;
    dto.reason = 'Accès support nécessaire';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejette un rôle ou une justification invalides', async () => {
    const dto = new UpdateRoleDto();
    dto.role = 'OWNER' as UserRole;
    dto.reason = '';

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['role', 'reason']),
    );
  });
});
