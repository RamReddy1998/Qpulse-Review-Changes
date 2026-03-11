import { CertificationRepository } from '../repositories/certification.repository';
import { QuestionRepository } from '../repositories/question.repository';
import { NotFoundError } from '../utils/errors';

export class CertificationService {
  private certRepo: CertificationRepository;
  private questionRepo: QuestionRepository;

  constructor() {
    this.certRepo = new CertificationRepository();
    this.questionRepo = new QuestionRepository();
  }

  async getAll() {
    return this.certRepo.findAll();
  }

  async getById(id: string) {
    const cert = await this.certRepo.findById(id);
    if (!cert) {
      throw new NotFoundError('Certification not found');
    }
    return cert;
  }

  async getQuestionCounts() {
    return this.certRepo.getQuestionCountByCertification();
  }

  async getTopics(id: string) {
    return this.questionRepo.getTopicsByCertification(id);
  }

  async getDifficulties(id: string) {
    return this.questionRepo.getDifficultiesByCertification(id);
  }
}
