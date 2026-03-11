import prisma from '../config/prisma';

export class CertificationRepository {
  async findAll() {
    return prisma.certification.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateExamDate(id: string, examDate: Date | null) {
    return prisma.certification.update({
      where: { id },
      data: { examDate },
    });
  }

  async findById(id: string) {
    return prisma.certification.findUnique({
      where: { id },
      include: {
        _count: { select: { questions: true } },
      },
    });
  }

  async findByName(name: string) {
    return prisma.certification.findUnique({ where: { name } });
  }

  async create(name: string, description: string) {
    return prisma.certification.create({
      data: { name, description },
    });
  }

  async getQuestionCountByCertification() {
    return prisma.certification.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { questions: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.certification.delete({
      where: { id },
    });
  }
}
