import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: { phone: string }) {
    const phone = (dto.phone || '').trim();
    if (!phone) throw new BadRequestException('phone is required');

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
      select: { id: true, phone: true, createdAt: true },
    });

    return { user_id: user.id, phone: user.phone };
  }
}
