import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { authRequired } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);   // POST /api/auth/login
router.get('/me', authRequired, me); // GET /api/auth/me (protegido)

export default router;
