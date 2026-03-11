import prisma from '../config/prisma';

export class MistakeRepository {
  async upsert(userId: string, questionId: string) {
    return prisma.mistakeLog.upsert({
      where: {
        userId_questionId: { userId, questionId },
      },
      update: {
        mistakeCount: { increment: 1 },
        lastAttemptedAt: new Date(),
      },
      create: {
        userId,
        questionId,
        mistakeCount: 1,
      },
    });
  }

  async findByUser(userId: string, page: number, limit: number) {
    const [mistakes, total] = await Promise.all([
      prisma.mistakeLog.findMany({
        where: { userId },
        include: {
          question: {
            select: {
              id: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              topic: true,
              difficulty: true,
              certificationId: true,
              certification: { select: { name: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { mistakeCount: 'desc' },
      }),
      prisma.mistakeLog.count({ where: { userId } }),
    ]);
    return { mistakes, total };
  }

  async getTopMistakeTopics(userId: string, limit: number = 10) {
    const mistakes = await prisma.mistakeLog.findMany({
      where: { userId },
      include: {
        question: { select: { topic: true, difficulty: true } },
      },
      orderBy: { mistakeCount: 'desc' },
      take: limit * 5,
    });

    // Aggregate by topic
    const topicMap = new Map<string, { count: number; totalMistakes: number }>();
    for (const m of mistakes) {
      const topic = m.question.topic || 'General';
      const existing = topicMap.get(topic) || { count: 0, totalMistakes: 0 };
      existing.count += 1;
      existing.totalMistakes += m.mistakeCount;
      topicMap.set(topic, existing);
    }

    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({ topic, ...data }))
      .sort((a, b) => b.totalMistakes - a.totalMistakes)
      .slice(0, limit);
  }
}
