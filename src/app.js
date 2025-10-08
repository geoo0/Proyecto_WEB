import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import diagRoutes from './routes/diag.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js'; // <-- NUEVO
import ducaRoutes from './routes/duca.routes.js'; // <-- NUEVO
import { notFound, errorHandler } from './middlewares/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', diagRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);  // ya no romperá
  app.use('/api/duca', ducaRoutes);                 // <-- NUEVO

  app.use(notFound);
  app.use(errorHandler);

  return app;
}