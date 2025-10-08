import { Router } from 'express';
import { authRequired, transportistaOnly } from '../middlewares/auth.js';
import { recepcionDUCA } from '../controllers/duca.controller.js';

const router = Router();

// Solo autenticado + rol TRANSPORTISTA
router.post('/recepcion', authRequired, transportistaOnly, recepcionDUCA);

export default router;
