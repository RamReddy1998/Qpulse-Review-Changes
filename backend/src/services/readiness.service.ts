import { MockTestRepository } from '../repositories/mocktest.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { ReadinessRepository } from '../repositories/readiness.repository';
import { ReadinessScoreData } from '../types';
import logger from '../config/logger';

export class ReadinessService {
  private mockTestRepo: MockTestRepository;
  private activityRepo: ActivityRepository;
  private readinessRepo: ReadinessRepository;

  constructor() {
    this.mockTestRepo = new MockTestRepository();
    this.activityRepo = new ActivityRepository();
    this.readinessRepo = new ReadinessRepository();
  }

  async calculateReadiness(userId: string, certificationId?: string): Promise<ReadinessScoreData> {
    // 1. Average Score (from mock tests)
    const mockScores = await this.mockTestRepo.getUserMockTestScores(userId, certificationId);
    const avgScore = this.calculateAvgScore(mockScores);

    // 2. Trend Growth (improvement over recent tests)
    const trendGrowth = this.calculateTrendGrowth(mockScores);

    // 3. Topic Mastery (from activity logs)
    const topicAccuracy = await this.activityRepo.getTopicAccuracy(userId, certificationId);
    const topicMastery = this.calculateTopicMastery(topicAccuracy);

    // 4. Time Efficiency
    const timeEfficiency = this.calculateTimeEfficiency(topicAccuracy);

    // Final readiness score formula:
    // readiness = (0.4 × avg_score) + (0.2 × trend_growth) + (0.2 × topic_mastery) + (0.2 × time_efficiency)
    const finalScore = Math.round(
      0.4 * avgScore + 0.2 * trendGrowth + 0.2 * topicMastery + 0.2 * timeEfficiency
    );

    const clampedScore = Math.max(0, Math.min(100, finalScore));
    const status = this.getStatus(clampedScore);

    // Persist (avoid creating duplicate entries for the same day)
    const todayKey = new Date().toISOString().slice(0, 10);
    const latest = await this.readinessRepo.getLatest(userId, certificationId);

    if (latest && latest.calculatedAt.toISOString().slice(0, 10) === todayKey) {
      logger.info('Readiness already calculated today - skipping duplicate persist', {
        userId,
        certificationId,
        latestId: latest.id,
      });
    } else {
      await this.readinessRepo.create(userId, clampedScore, status, certificationId);
    }

    logger.info('Readiness score calculated', {
      userId,
      certificationId,
      avgScore,
      trendGrowth,
      topicMastery,
      timeEfficiency,
      finalScore: clampedScore,
      status,
    });

    return {
      avgScore: Math.round(avgScore),
      trendGrowth: Math.round(trendGrowth),
      topicMastery: Math.round(topicMastery),
      timeEfficiency: Math.round(timeEfficiency),
      finalScore: clampedScore,
      status,
    };
  }

  async getLatest(userId: string, certificationId?: string) {
    return this.readinessRepo.getLatest(userId, certificationId);
  }

  async getHistory(userId: string, certificationId?: string) {
    return this.readinessRepo.getHistory(userId, 20, certificationId);
  }

  private calculateAvgScore(
    mockScores: Array<{ totalScore: number; completedAt: Date | null; startedAt: Date }>
  ): number {
    if (mockScores.length === 0) return 0;

    const totalPercentages = mockScores.map((s) => {
      // Normalize to 0-100 scale
      return Math.min(100, Math.max(0, s.totalScore * 3.33)); // Assuming ~30 questions per test
    });

    return totalPercentages.reduce((sum, p) => sum + p, 0) / totalPercentages.length;
  }

  private calculateTrendGrowth(
    mockScores: Array<{ totalScore: number; completedAt: Date | null }>
  ): number {
    if (mockScores.length < 2) return 50; // Neutral if not enough data

    const recent = mockScores.slice(-5);
    if (recent.length < 2) return 50;

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const avgFirst = firstHalf.reduce((s, m) => s + m.totalScore, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + m.totalScore, 0) / secondHalf.length;

    if (avgFirst === 0) return avgSecond > 0 ? 75 : 50;

    const growth = ((avgSecond - avgFirst) / avgFirst) * 100;
    // Normalize growth to 0-100 scale
    return Math.max(0, Math.min(100, 50 + growth));
  }

  private calculateTopicMastery(
    topicAccuracy: Array<{ topic: string; accuracy: number; total: number }>
  ): number {
    if (topicAccuracy.length === 0) return 0;

    // Weighted by number of questions attempted in each topic
    const totalAttempts = topicAccuracy.reduce((sum, t) => sum + t.total, 0);
    if (totalAttempts === 0) return 0;

    const weightedScore = topicAccuracy.reduce((sum, t) => {
      return sum + (t.accuracy * t.total) / totalAttempts;
    }, 0);

    return weightedScore;
  }

  private calculateTimeEfficiency(
    topicAccuracy: Array<{ topic: string; avgTime: number; accuracy: number }>
  ): number {
    if (topicAccuracy.length === 0) return 50;

    // Ideal time per question: 60-90 seconds
    const IDEAL_TIME = 75;
    const MAX_TIME = 180;

    const efficiencies = topicAccuracy.map((t) => {
      if (t.avgTime <= IDEAL_TIME) return 100;
      if (t.avgTime >= MAX_TIME) return 30;
      // Linear scale between ideal and max
      return Math.round(100 - ((t.avgTime - IDEAL_TIME) / (MAX_TIME - IDEAL_TIME)) * 70);
    });

    return efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length;
  }

  private getStatus(score: number): string {
    if (score >= 80) return 'exam_ready';
    if (score >= 60) return 'almost_ready';
    if (score >= 40) return 'needs_improvement';
    return 'not_ready';
  }
}
