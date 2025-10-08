import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import diagRoutes from './routes/diag.routes.js';
import { notFound, errorHandler } from './middlewares/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Servir estáticos (index.html)
  app.use(express.static(path.join(__dirname, 'public')));

  // API base: /api
  app.use('/api', diagRoutes);

  // 404 + error
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
