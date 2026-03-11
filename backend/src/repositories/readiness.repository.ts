import prisma from '../config/prisma';

export class ReadinessRepository {
  async create(userId: string, score: number, status: string, certificationId?: string) {
    return prisma.readinessScore.create({
      data: { userId, score, status, certificationId: certificationId || null },
    });
  }

  async getLatest(userId: string, certificationId?: string) {
    const where: Record<string, unknown> = { userId };
    if (certificationId) where.certificationId = certificationId;

    return prisma.readinessScore.findFirst({
      where,
      orderBy: { calculatedAt: 'desc' },
      include: { certification: { select: { name: true } } },
    });
  }

  async getHistory(userId: string, limit: number = 20, certificationId?: string) {
    const where: Record<string, unknown> = { userId };
    if (certificationId) where.certificationId = certificationId;

    return prisma.readinessScore.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
      take: limit,
      include: { certification: { select: { name: true } } },
    });
  }

  async getAverageScore() {
    const users = await prisma.user.findMany({
      where: { role: 'LEARNER' },
      select: { id: true },
    });

    if (users.length === 0) return 0;

    let totalScore = 0;
    let count = 0;

    for (const user of users) {
      const latest = await prisma.readinessScore.findFirst({
        where: { userId: user.id },
        orderBy: { calculatedAt: 'desc' },
      });
      if (latest) {
        totalScore += latest.score;
        count += 1;
      }
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  }
}
