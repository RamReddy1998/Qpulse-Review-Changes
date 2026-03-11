import prisma from '../config/prisma';

export class MockTestRepository {
  async create(userId: string, mockName: string, certificationId: string) {
    return prisma.mockTest.create({
      data: { userId, mockName, certificationId },
    });
  }

  async findById(id: string) {
    return prisma.mockTest.findUnique({
      where: { id },
      include: {
        attempts: {
          include: { question: true },
        },
        certification: { select: { name: true } },
      },
    });
  }

  async findByUser(userId: string, page: number, limit: number) {
    const [tests, total] = await Promise.all([
      prisma.mockTest.findMany({
        where: { userId },
        include: {
          certification: { select: { name: true } },
          _count: { select: { attempts: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.mockTest.count({ where: { userId } }),
    ]);
    return { tests, total };
  }

  async complete(id: string, totalScore: number) {
    return prisma.mockTest.update({
      where: { id },
      data: {
        totalScore,
        completedAt: new Date(),
      },
    });
  }

  async createAttempts(
    mockTestId: string,
    attempts: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      timeSpentSec: number;
    }>
  ) {
    return prisma.mockTestAttempt.createMany({
      data: attempts.map((a) => ({
        mockTestId,
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        timeSpentSec: a.timeSpentSec,
      })),
    });
  }

  async getUserMockTestScores(userId: string, certificationId?: string) {
    const where: Record<string, unknown> = { userId, completedAt: { not: null } };
    if (certificationId) where.certificationId = certificationId;

    return prisma.mockTest.findMany({
      where,
      select: { totalScore: true, completedAt: true, startedAt: true },
      orderBy: { completedAt: 'asc' },
    });
  }

  async countByUser(userId: string) {
    return prisma.mockTest.count({ where: { userId } });
  }

  async countAll() {
    return prisma.mockTest.count();
  }
}
