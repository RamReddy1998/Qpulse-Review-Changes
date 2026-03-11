import { AiExplanationResponse } from '../../types';

export interface AiProviderConfig {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AiProvider {
  /**
   * Generate an explanation for a question
   */
  generateExplanation(
    questionText: string,
    options: Record<string, string>,
    correctAnswer: string,
    userAnswer?: string
  ): Promise<AiExplanationResponse>;

  /**
   * Generate a hint for a question (without revealing the answer)
   */
  generateHint(
    questionText: string,
    options: Record<string, string>,
    correctAnswer: string
  ): Promise<{ hints: string[]; tips: string[]; solvingStrategy: string }>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Extract MCQ questions from text
   */
  extractQuestions(text: string): Promise<any[]>;
}
