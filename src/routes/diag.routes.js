import { Router } from 'express';
import { getDbDiag, getHealth } from '../controllers/diag.controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/_diag/db', getDbDiag);

export default router;
