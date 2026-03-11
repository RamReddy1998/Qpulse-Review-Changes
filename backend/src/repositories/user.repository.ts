import { Role } from '@prisma/client';
import prisma from '../config/prisma';

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(username: string, passwordHash: string, role: Role) {
    return prisma.user.create({
      data: { username, passwordHash, role },
    });
  }

  async findAll(page: number, limit: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'LEARNER' },
        select: {
          id: true,
          username: true,
          role: true,
          learningType: true,
          createdAt: true,
          batchParticipants: {
            include: {
              batch: {
                select: { id: true, batchName: true, certification: { select: { name: true } } },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'LEARNER' } }),
    ]);
    return { users, total };
  }

  async updateLearningType(userId: string, learningType: 'BATCH' | 'SELF') {
    return prisma.user.update({
      where: { id: userId },
      data: { learningType },
    });
  }

  async countByRole(role: Role) {
    return prisma.user.count({ where: { role } });
  }

  async findLearnersByUsername(usernames: string[]) {
    return prisma.user.findMany({
      where: { username: { in: usernames }, role: 'LEARNER' },
      select: { id: true, username: true },
    });
  }
}
