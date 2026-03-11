import prisma from '../config/prisma';

export class ActivityRepository {
  async create(userId: string, questionId: string, timeSpentSec: number, isCorrect: boolean, topic: string) {
    return prisma.learnerActivityLog.create({
      data: { userId, questionId, timeSpentSec, isCorrect, topic },
    });
  }

  async getByUser(userId: string, page: number, limit: number) {
    const [logs, total] = await Promise.all([
      prisma.learnerActivityLog.findMany({
        where: { userId },
        include: {
          question: {
            select: { questionText: true, topic: true, difficulty: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.learnerActivityLog.count({ where: { userId } }),
    ]);
    return { logs, total };
  }

  async getTopicAccuracy(userId: string, certificationId?: string) {
    const where: Record<string, unknown> = { userId };
    if (certificationId) {
      where.question = { certificationId };
    }

    const logs = await prisma.learnerActivityLog.findMany({
      where,
      select: { topic: true, isCorrect: true, timeSpentSec: true },
    });

    const topicMap = new Map<string, { correct: number; total: number; totalTime: number }>();
    for (const log of logs) {
      const topic = log.topic || 'General';
      const existing = topicMap.get(topic) || { correct: 0, total: 0, totalTime: 0 };
      existing.total += 1;
      existing.totalTime += log.timeSpentSec;
      if (log.isCorrect) existing.correct += 1;
      topicMap.set(topic, existing);
    }

    return Array.from(topicMap.entries()).map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      avgTime: data.total > 0 ? Math.round(data.totalTime / data.total) : 0,
    }));
  }

  async getTotalTimeSpent(userId: string) {
    const result = await prisma.learnerActivityLog.aggregate({
      where: { userId },
      _sum: { timeSpentSec: true },
      _count: true,
    });
    return {
      totalTimeSec: result._sum.timeSpentSec || 0,
      totalAttempts: result._count,
    };
  }

  async getRecentActivity(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.learnerActivityLog.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { isCorrect: true, timeSpentSec: true, createdAt: true, topic: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getActiveLearnerCount(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const result = await prisma.learnerActivityLog.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return result.length;
  }
}
