import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        upsert: jest.fn(),
      },
    };
    service = new AuthService(prisma);
  });

  // Test Case: Should reject login when phone is missing or blank.
  it('throws BadRequestException when phone is empty', async () => {
    await expect(service.login({ phone: '   ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should trim input phone and return normalized login response.
  it('upserts user with trimmed phone and returns user payload', async () => {
    prisma.user.upsert.mockResolvedValue({
      id: 'u1',
      phone: '+1234567890',
      createdAt: new Date(),
    });

    const result = await service.login({ phone: '  +1234567890  ' });

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { phone: '+1234567890' },
      update: {},
      create: { phone: '+1234567890' },
      select: { id: true, phone: true, createdAt: true },
    });
    expect(result).toEqual({ user_id: 'u1', phone: '+1234567890' });
  });
});
