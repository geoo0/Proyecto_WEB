import { Router } from 'express';
import { authRequired, adminOnly } from '../middlewares/auth.js';
import {
  listUsers, createUser, updateUser, deactivateUser
} from '../controllers/users.controller.js';

const router = Router();

// Todas protegidas y solo ADMIN
router.use(authRequired, adminOnly);

router.get('/', listUsers);             // GET /api/users
router.post('/', createUser);           // POST /api/users
router.put('/:id', updateUser);         // PUT /api/users/:id
router.delete('/:id', deactivateUser);  // DELETE /api/users/:id  (borrado lógico)

export default router;
