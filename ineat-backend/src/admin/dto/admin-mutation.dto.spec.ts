import 'reflect-metadata';
import { validate } from 'class-validator';
import { UserRole } from '../../../prisma/generated/prisma/enums';
import { UpdateRoleDto } from './admin-mutation.dto';
import { plainToInstance } from 'class-transformer';
import { AdminUsersQueryDto } from './admin-users-query.dto';

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

describe('AdminUsersQueryDto', () => {
  it('transforme une pagination valide', async () => {
    const dto = plainToInstance(AdminUsersQueryDto, {
      page: '2',
      pageSize: '10',
      sort: 'email',
      order: 'asc',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual(
      expect.objectContaining({ page: 2, pageSize: 10, sort: 'email' }),
    );
  });

  it('rejette une taille non bornée et un filtre invalide', async () => {
    const dto = plainToInstance(AdminUsersQueryDto, {
      pageSize: '1000',
      role: 'OWNER',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['pageSize', 'role']),
    );
  });
});
