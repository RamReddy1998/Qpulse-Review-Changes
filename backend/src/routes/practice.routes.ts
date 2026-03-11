import { Router } from 'express';
import { PracticeController } from '../controllers/practice.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('LEARNER'));

router.get('/questions/:certificationId', PracticeController.getQuestions);
router.get('/questions/:certificationId/filtered', PracticeController.getFilteredQuestions);
router.get('/questions/:certificationId/count', PracticeController.getFilterCount);
router.get('/question/:questionId', PracticeController.getQuestionById);
router.post('/submit', PracticeController.submitAnswer);
router.get('/explanation/:questionId', PracticeController.getExplanation);
router.get('/hint/:questionId', PracticeController.getHint);
router.get('/topics/:certificationId', PracticeController.getTopics);
router.get('/difficulties/:certificationId', PracticeController.getDifficulties);
router.get('/questions/:certificationId/offset', PracticeController.getQuestionByOffset);
router.get('/questions/:certificationId/total', PracticeController.getTotalCount);

export default router;
