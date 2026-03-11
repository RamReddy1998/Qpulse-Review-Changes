import { Router } from 'express';
import authRoutes from './auth.routes';
import certificationRoutes from './certification.routes';
import practiceRoutes from './practice.routes';
import mocktestRoutes from './mocktest.routes';
import readinessRoutes from './readiness.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/certifications', certificationRoutes);
router.use('/practice', practiceRoutes);
router.use('/mock-tests', mocktestRoutes);
router.use('/readiness', readinessRoutes);
router.use('/admin', adminRoutes);

export default router;
