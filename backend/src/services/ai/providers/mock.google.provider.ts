import { AiProvider, AiProviderConfig } from '../ai.interface';
import { AiExplanationResponse } from '../../../types';
import logger from '../../../config/logger';

export class MockGoogleProvider implements AiProvider {
  private config: AiProviderConfig;

  constructor(config: AiProviderConfig = {}) {
    this.config = config;
    logger.info('MockGoogleProvider initialized (local development mode)');
  }

  getProviderName(): string {
    return 'mock-google';
  }

  async generateExplanation(
    questionText: string,
    options: Record<string, string>,
    correctAnswer: string,
    userAnswer?: string
  ): Promise<AiExplanationResponse> {
    logger.debug('MockGoogleProvider: generating explanation', {
      questionPreview: questionText.substring(0, 80),
      correctAnswer,
      userAnswer,
    });

    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 200));

    const correctOption = options[correctAnswer] || 'N/A';
    const wrongExplanations: Record<string, string> = {};

    for (const [key, value] of Object.entries(options)) {
      if (key !== correctAnswer) {
        wrongExplanations[key] = `Option ${key} ("${value.substring(0, 60).trim()}...") is incorrect because it does not fully address the requirements stated in the question. The correct approach involves the methodology described in option ${correctAnswer}.`;
      }
    }

    return {
      stepByStep: `1. Analyze the question requirements carefully.\n2. Evaluate each option against the core requirements.\n3. Option ${correctAnswer} is correct because it directly addresses the question: "${correctOption.substring(0, 100).trim()}"\n4. Verify by eliminating other options that have limitations or incorrect approaches.`,
      conceptual: `This question tests your understanding of the underlying concept. The correct answer (${correctAnswer}) demonstrates the best practice approach. Key concept: Always consider the most efficient, secure, and scalable solution that meets all requirements with the fewest steps.`,
      examOriented: `Exam Tip: When you see questions like this, focus on the keywords in the question. Look for terms like "fewest steps," "recommended practice," "most cost-effective," or "least operational overhead." Option ${correctAnswer} aligns with the exam's emphasis on best practices and practical implementation.`,
      correctAnswerExplanation: `Option ${correctAnswer} ("${correctOption.substring(0, 120).trim()}") is the correct answer because it provides the most appropriate solution that meets all the requirements specified in the question while following recommended best practices.`,
      wrongOptionsExplanation: wrongExplanations,
      examTrap: `Common exam trap: Don't confuse similar-sounding options. Some options may seem partially correct but miss key requirements. Always read ALL options before selecting. In this case, ${userAnswer && userAnswer !== correctAnswer ? `you selected ${userAnswer} which` : 'incorrect options'} may seem valid but ${userAnswer && userAnswer !== correctAnswer ? 'does' : 'do'} not fully meet the stated requirements.`,
      memoryTrick: `Remember: For this type of question, think "${correctAnswer} = Best Practice." Associate the correct answer with the key action verb in the question. Create a mental model linking the scenario to the solution pattern.`,
      sourceLinks: [
        { title: 'Official Documentation', url: 'https://cloud.google.com/docs' },
        { title: 'Best Practices Guide', url: 'https://example.com/best-practices' }
      ]
    };
  }

  async generateHint(
    questionText: string,
    options: Record<string, string>,
    correctAnswer: string
  ): Promise<{ hints: string[]; tips: string[]; solvingStrategy: string }> {
    logger.debug('MockGoogleProvider: generating hint', {
      questionPreview: questionText.substring(0, 80),
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      hints: [
        'Think about the core architectural principle being tested here.',
        'Consider which option aligns most closely with scalability and security best practices.',
      ],
      tips: [
        'Keywords like "least operational overhead" often point to managed services.',
      ],
      solvingStrategy: 'First, eliminate any options that are technically impossible or insecure. Then, compare the remaining options based on the specific requirements in the question.',
    };
  }

  async extractQuestions(text: string): Promise<any[]> {
    logger.debug('MockGoogleProvider: extracting questions', {
      textPreview: text.substring(0, 80),
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    return [
      {
        questionText: "Sample question extracted from text",
        options: { A: "First", B: "Second", C: "Third", D: "Fourth" },
        correctAnswer: "A",
        difficulty: "Medium",
        topic: "General"
      }
    ];
  }
}
