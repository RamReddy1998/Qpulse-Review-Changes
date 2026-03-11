import prisma from '../config/prisma';

export class SessionRepository {
  async create(userId: string, refreshToken: string, expiresAt: Date) {
    return prisma.session.create({
      data: { userId, refreshToken, expiresAt },
    });
  }

  async findByRefreshToken(refreshToken: string) {
    return prisma.session.findFirst({
      where: { refreshToken },
      include: { user: true },
    });
  }

  async deleteByRefreshToken(refreshToken: string) {
    return prisma.session.deleteMany({ where: { refreshToken } });
  }

  async deleteAllByUserId(userId: string) {
    return prisma.session.deleteMany({ where: { userId } });
  }

  async deleteExpired() {
    return prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
