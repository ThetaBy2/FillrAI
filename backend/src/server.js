import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { connect, ping } from './db.js';
import { seedDatabase } from './seed.js';
import authRoutes, { requireLogin } from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import schemeRoutes from './routes/schemes.js';
import applicationRoutes from './routes/applications.js';
import chatRoutes from './routes/chat.js';
import accountRoutes from './routes/account.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
dotenv.config({ path: path.join(root, '.env') });

const app = express();
app.use(express.json({ limit: '2mb' }));

// Frontend: plain HTML/CSS/JS files.
app.use(express.static(path.join(root, 'frontend')));
app.get('/', (_req, res) => res.redirect('/dashboard.html'));

// Public API routes
app.use('/api/auth', authRoutes);
app.get('/api/health', async (_req, res) => {
  await ping();
  res.json({ status: 'ok' });
});

// Everything below needs a logged-in user.
app.use('/api', requireLogin);
app.use('/api/documents', documentRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', accountRoutes);

// Any error thrown in a route ends up here.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: err.message || 'Internal server error' });
});

await connect();
await seedDatabase(path.join(here, '../seed_data/fillrai_seed.json'));

const port = Number(process.env.PORT || 8000);
app.listen(port, '0.0.0.0', () => console.log(`FillrAI running at http://localhost:${port}`));

