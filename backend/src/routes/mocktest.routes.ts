import { Router } from 'express';
import { MockTestController } from '../controllers/mocktest.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate, authorize('LEARNER'));

router.post('/start', MockTestController.start);
router.post('/:mockTestId/submit', MockTestController.submit);
router.get('/:mockTestId/result', MockTestController.getResult);
router.get('/history', MockTestController.getUserTests);

export default router;
