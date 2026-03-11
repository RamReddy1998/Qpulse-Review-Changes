import prisma from '../config/prisma';

export class AiCacheRepository {
  async findByQuestionAndType(questionId: string, promptType: string) {
    return prisma.aiResponseCache.findUnique({
      where: {
        questionId_promptType: { questionId, promptType },
      },
    });
  }

  async save(questionId: string, promptType: string, response: object) {
    return prisma.aiResponseCache.upsert({
      where: {
        questionId_promptType: { questionId, promptType },
      },
      update: { response: response as never },
      create: { questionId, promptType, response: response as never },
    });
  }
}
