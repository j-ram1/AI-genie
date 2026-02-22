import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  // Test Case: Should keep service class available for DI usage.
  it('class is defined', () => {
    expect(PrismaService).toBeDefined();
  });

  // Test Case: Should throw clear error when DATABASE_URL is missing.
  it('throws when DATABASE_URL is not configured', () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(() => new PrismaService(config)).toThrow(
      'DATABASE_URL is missing. Check backend/.env',
    );
  });
});
