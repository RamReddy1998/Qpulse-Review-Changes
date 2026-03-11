import { Router } from 'express';
import { ReadinessController } from '../controllers/readiness.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('LEARNER'));

router.post('/calculate', ReadinessController.calculate);
router.get('/latest', ReadinessController.getLatest);
router.get('/history', ReadinessController.getHistory);
router.get('/topic-accuracy', ReadinessController.getTopicAccuracy);
router.get('/mistakes', ReadinessController.getMistakes);
router.get('/activity', ReadinessController.getActivityLogs);

export default router;
