import { UserRepository } from '../repositories/user.repository';
import { MockTestRepository } from '../repositories/mocktest.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { ReadinessRepository } from '../repositories/readiness.repository';
import { MistakeRepository } from '../repositories/mistake.repository';
import { BatchRepository } from '../repositories/batch.repository';
import { QuestionRepository } from '../repositories/question.repository';
import { CertificationRepository } from '../repositories/certification.repository';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import logger from '../config/logger';
import { getAiProvider } from './ai/ai.factory';
import * as XLSX from 'xlsx';

// Use classic pdf-parse
const pdf_parser: any = require('pdf-parse');

export class AdminService {
  private userRepo: UserRepository;
  private mockTestRepo: MockTestRepository;
  private activityRepo: ActivityRepository;
  private readinessRepo: ReadinessRepository;
  private mistakeRepo: MistakeRepository;
  private batchRepo: BatchRepository;
  private questionRepo: QuestionRepository;
  private certRepo: CertificationRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.mockTestRepo = new MockTestRepository();
    this.activityRepo = new ActivityRepository();
    this.readinessRepo = new ReadinessRepository();
    this.mistakeRepo = new MistakeRepository();
    this.batchRepo = new BatchRepository();
    this.questionRepo = new QuestionRepository();
    this.certRepo = new CertificationRepository();
  }

  async getDashboard() {
    const [totalLearners, activeLearners, avgReadiness, totalMocks, certifications, recentBatches] = await Promise.all([
      this.userRepo.countByRole('LEARNER'),
      this.activityRepo.getActiveLearnerCount(7),
      this.readinessRepo.getAverageScore(),
      this.mockTestRepo.countAll(),
      this.certRepo.findAll(),
      this.batchRepo.findAll(1, 50),
    ]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Filter batches: Completed, Current Month (In Progress), and Next Month
    const completedBatches = recentBatches.batches.filter((b) => {
      if (!b.endTime) return false;
      return new Date(b.endTime) < now;
    });

    const currentMonthBatches = recentBatches.batches.filter((b) => {
      if (!b.startTime) return false;
      const st = new Date(b.startTime);
      const et = b.endTime ? new Date(b.endTime) : null;
      // Current if (started this month OR started before) AND (not ended yet)
      return st <= now && (!et || et >= now);
    });

    const nextMonthBatches = recentBatches.batches.filter((b) => {
      if (!b.startTime) return false;
      const st = new Date(b.startTime);
      // Next Month if starts in the specified next month
      return st.getMonth() === nextMonth && st.getFullYear() === nextMonthYear;
    });

    return {
      totalLearners,
      activeLearners,
      avgReadiness,
      totalMocks,
      completedBatches: completedBatches.map((b) => ({
        id: b.id,
        batchName: b.batchName,
        certificationName: b.certification.name,
        participantCount: b._count?.participants || 0,
        startTime: b.startTime,
        endTime: b.endTime,
        createdAt: b.createdAt,
      })),
      currentMonthBatches: currentMonthBatches.map((b) => ({
        id: b.id,
        batchName: b.batchName,
        certificationName: b.certification.name,
        participantCount: b._count?.participants || 0,
        startTime: b.startTime,
        endTime: b.endTime,
        createdAt: b.createdAt,
      })),
      nextMonthBatches: nextMonthBatches.map((b) => ({
        id: b.id,
        batchName: b.batchName,
        certificationName: b.certification.name,
        participantCount: b._count?.participants || 0,
        startTime: b.startTime,
        endTime: b.endTime,
        createdAt: b.createdAt,
      })),
    };
  }

  async getLearners(page: number, limit: number) {
    return this.userRepo.findAll(page, limit);
  }

  async getLearnerAnalytics(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user || user.role !== 'LEARNER') {
      throw new NotFoundError('Learner not found');
    }

    const [timeStats, topicAccuracy, topMistakes, mockTestCount, latestReadiness, userBatches] = await Promise.all([
      this.activityRepo.getTotalTimeSpent(userId),
      this.activityRepo.getTopicAccuracy(userId),
      this.mistakeRepo.getTopMistakeTopics(userId),
      this.mockTestRepo.countByUser(userId),
      this.readinessRepo.getLatest(userId),
      this.batchRepo.findBatchesByUser(userId),
    ]);

    return {
      username: user.username,
      learningType: user.learningType || 'SELF',
      totalTimeSec: timeStats.totalTimeSec,
      totalAttempts: timeStats.totalAttempts,
      mockTestCount,
      readinessScore: latestReadiness?.score || 0,
      readinessStatus: latestReadiness?.status || 'not_ready',
      topicAccuracy,
      weakTopics: topMistakes,
      batches: userBatches.map((b) => ({
        id: b.id,
        batchName: b.batchName,
        certificationName: b.certification.name,
      })),
    };
  }

  async getBatchParticipantsWithAnalytics(batchId: string, page: number, limit: number) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    const participants = batch.participants || [];
    const start = (page - 1) * limit;
    const paged = participants.slice(start, start + limit);

    const enriched = await Promise.all(
      paged.map(async (p) => {
        const [activityCount, mockCount, latestReadiness] = await Promise.all([
          this.activityRepo.getTotalTimeSpent(p.user.id),
          this.mockTestRepo.countByUser(p.user.id),
          this.readinessRepo.getLatest(p.user.id),
        ]);

        // Determine activity status based on recent activity
        const recentActivity = await this.activityRepo.getRecentActivity(p.user.id, 7);
        let activityStatus: 'Active' | 'Inactive' = 'Inactive';
        if (recentActivity.length >= 3 || mockCount >= 1) {
          activityStatus = 'Active';
        }

        return {
          id: p.id,
          userId: p.user.id,
          username: p.user.username,
          certification: batch.certification.name,
          scoreRange: latestReadiness
            ? `${Math.max(0, Math.round(latestReadiness.score - 10))}-${Math.min(100, Math.round(latestReadiness.score + 10))}%`
            : 'N/A',
          activityStatus,
        };
      })
    );

    return {
      data: enriched,
      pagination: {
        total: participants.length,
        page,
        limit,
        totalPages: Math.ceil(participants.length / limit),
      },
    };
  }

  async getWeaknessQuestions(topic: string, certificationId?: string) {
    return this.questionRepo.findByTopicForWeakness(topic, certificationId);
  }

  // Batch management
  async createBatch(batchName: string, certificationId: string, startTime?: string, endTime?: string) {
    const st = startTime ? new Date(startTime) : undefined;
    const et = endTime ? new Date(endTime) : undefined;
    return this.batchRepo.create(batchName, certificationId, st, et);
  }

  async getBatches(page: number, limit: number) {
    return this.batchRepo.findAll(page, limit);
  }

  async updateBatch(batchId: string, data: { batchName?: string; certificationId?: string; startTime?: string; endTime?: string }) {
    const updateData: any = { ...data };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);

    return this.batchRepo.update(batchId, updateData);
  }

  async deleteBatch(batchId: string) {
    return this.batchRepo.delete(batchId);
  }

  async cleanupExpiredBatches() {
    // Disabled automatic deletion as requested - batches now move to "Completed" section
    /*
    const expired = await this.batchRepo.findExpiredBatches(new Date());
    if (expired.length > 0) {
      const ids = expired.map((b) => b.id);
      await this.batchRepo.deleteMany(ids);
      logger.info(`Automatically deleted ${expired.length} expired batches`, { batchIds: ids });
      return expired.length;
    }
    */
    return 0;
  }

  async getBatchDetails(batchId: string) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }
    return batch;
  }

  async addParticipant(batchId: string, username: string) {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new NotFoundError(`User '${username}' not found`);
    }
    if (user.role !== 'LEARNER') {
      throw new BadRequestError('Only learners can be added to batches');
    }

    const isAlready = await this.batchRepo.isParticipant(batchId, user.id);
    if (isAlready) {
      throw new ConflictError('User is already a participant in this batch');
    }

    await this.batchRepo.addParticipant(batchId, user.id);

    // Update learning type to BATCH
    await this.userRepo.updateLearningType(user.id, 'BATCH');

    logger.info('Participant added to batch', { batchId, username });

    return { message: `${username} added to batch successfully` };
  }

  async removeParticipant(batchId: string, userId: string) {
    await this.batchRepo.removeParticipant(batchId, userId);

    // Check if user is still in any other batch
    const otherBatches = await this.batchRepo.findBatchesByUser(userId);
    if (otherBatches.length === 0) {
      await this.userRepo.updateLearningType(userId, 'SELF');
    }

    return { message: 'Participant removed from batch' };
  }

  async createCertificationAndUploadQuestions(certificationName: string, questions: Array<{
    questionText: string;
    options: Record<string, string>;
    correctAnswer: string;
    difficulty: string;
    topic: string;
  }>) {
    if (!certificationName || certificationName.trim().length === 0) {
      throw new BadRequestError('Certification name is required');
    }

    // Try to find existing
    let cert = await this.certRepo.findByName(certificationName.trim());

    // Create new if it doesn't exist
    if (!cert) {
      cert = await this.certRepo.create(certificationName.trim(), `${certificationName.trim()} Certification`);
      logger.info('Created new certification from upload', { certId: cert.id, name: cert.name });
    }

    // Reuse existing bulk upload logic
    return this.uploadQuestions(cert.id, questions);
  }

  async uploadQuestions(certificationId: string, questions: Array<{
    questionText: string;
    options: Record<string, string>;
    correctAnswer: string;
    difficulty: string;
    topic: string;
  }>) {
    const results = {
      total: questions.length,
      successful: 0,
      failed: 0,
      failures: [] as Array<{ index: number; reason: string }>,
    };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Validate question
      if (!q.questionText || q.questionText.trim().length < 10) {
        results.failed++;
        results.failures.push({ index: i, reason: 'Question text too short or missing' });
        continue;
      }
      if (!q.options || Object.keys(q.options).length < 2) {
        results.failed++;
        results.failures.push({ index: i, reason: 'Missing options (need at least 2)' });
        continue;
      }
      if (!q.correctAnswer) {
        results.failed++;
        results.failures.push({ index: i, reason: 'Missing correct answer' });
        continue;
      }

      try {
        await this.questionRepo.createQuestion({
          certificationId,
          questionText: q.questionText.trim(),
          options: q.options,
          correctAnswer: q.correctAnswer.toUpperCase(),
          difficulty: q.difficulty || 'medium',
          topic: q.topic || 'General',
          source: 'upload',
        });
        results.successful++;
      } catch (error) {
        results.failed++;
        results.failures.push({
          index: i,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Questions uploaded', {
      certificationId,
      total: results.total,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  }

  // Question editing functionality
  async getQuestionsByCertification(certificationId: string, page: number = 1, limit: number = 50) {
    return this.questionRepo.findByCertification(certificationId, page, limit);
  }

  async updateQuestion(questionId: string, data: {
    questionText?: string;
    options?: Record<string, string>;
    correctAnswer?: string;
    difficulty?: string;
    topic?: string;
  }) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) throw new NotFoundError('Question not found');

    return this.questionRepo.updateQuestion(questionId, {
      ...data,
      correctAnswer: data.correctAnswer?.toUpperCase(),
    });
  }

  async deleteQuestion(questionId: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) throw new NotFoundError('Question not found');

    return this.questionRepo.deleteQuestion(questionId);
  }

  async deleteCertification(certificationId: string) {
    const cert = await this.certRepo.findById(certificationId);
    if (!cert) throw new NotFoundError('Certification not found');

    return this.certRepo.delete(certificationId);
  }

  async aiExtractQuestions(file: Express.Multer.File) {
    const text = await this.parseFileToText(file);
    const chunks = this.chunkText(text, 10000); // 10k tokens roughly 30k000 chars, let's play safe with 10k characters
    
    const aiProvider = getAiProvider();
    const allQuestions: any[] = [];
    
    for (const chunk of chunks) {
      try {
        const questions = await aiProvider.extractQuestions(chunk);
        allQuestions.push(...questions);
      } catch (error) {
        logger.error('Error extracting questions from chunk', { error });
      }
    }
    
    return allQuestions;
  }

  private async parseFileToText(file: Express.Multer.File): Promise<string> {
    const fileName = file.originalname.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      const data = await pdf_parser(file.buffer);
      return data.text || '';
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_csv(worksheet);
    } else if (fileName.endsWith('.json')) {
      return file.buffer.toString('utf-8');
    }
    
    throw new BadRequestError('Unsupported file type for AI extraction');
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    while (currentPos < text.length) {
      chunks.push(text.substring(currentPos, currentPos + chunkSize));
      currentPos += chunkSize;
    }
    return chunks;
  }
}
