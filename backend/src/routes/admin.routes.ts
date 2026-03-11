import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Learner management
router.get('/learners', AdminController.getLearners);
router.get('/learners/:userId/analytics', AdminController.getLearnerAnalytics);

// Batch management
router.post('/batches', AdminController.createBatch);
router.get('/batches', AdminController.getBatches);
router.get('/batches/:batchId', AdminController.getBatchDetails);
router.put('/batches/:batchId', AdminController.updateBatch);
router.delete('/batches/:batchId', AdminController.deleteBatch);
router.get('/batches/:batchId/analytics', AdminController.getBatchParticipantsAnalytics);
router.post('/batches/:batchId/participants', AdminController.addParticipant);
router.delete('/batches/:batchId/participants/:userId', AdminController.removeParticipant);

// Weakness detection
router.get('/weakness/questions', AdminController.getWeaknessQuestions);

// Question upload & editing
router.post('/questions/upload-new', AdminController.uploadQuestionsNewCertification);
router.post('/questions/:certificationId/upload', AdminController.uploadQuestions);
router.post('/questions/ai-extract', uploadMiddleware.single('file'), AdminController.aiExtractQuestions);

router.get('/certifications/:certificationId/questions', AdminController.getQuestionsByCertification);
router.put('/questions/:questionId', AdminController.updateQuestion);
router.delete('/questions/:questionId', AdminController.deleteQuestion);

router.delete('/certifications/:certificationId', AdminController.deleteCertification);

export default router;
