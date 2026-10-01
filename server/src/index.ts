// ============================================================
// SmartMind Server — Main Entry Point
// ============================================================
// Lightweight Express backend for AI services.
// Does NOT store the API key in frontend code.
// Falls back to mock mode when AI is not configured.
// ============================================================

import * as dotenv from 'dotenv';
dotenv.config({ override: true }); // override system env so .env values take precedence
import express from 'express';
import cors from 'cors';
import { getAIStatus } from './services/openai.js';
import { getBhashiniStatus } from './services/bhashini.js';
import reminiscenceRoutes from './routes/reminiscence.js';
import languageRoutes from './routes/language.js';
import syncRoutes from './routes/sync.js';

const app = express();
const rawPort = parseInt(process.env.PORT || '3001', 10);
const PORT = rawPort > 0 ? rawPort : 3001; // fallback if system env sets PORT=0
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ---- Middleware ----
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10mb' })); // 10MB for image uploads

// ---- Request logging ----
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} — ${_res.statusCode} — ${duration}ms`);
  });
  next();
});

// ---- Routes ----

// Health check (no secrets)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// AI status (no secrets exposed)
app.get('/api/ai/status', (_req, res) => {
  res.json(getAIStatus());
});

// Reminiscence routes
app.use('/api/reminiscence', reminiscenceRoutes);

// Language routes (Bhashini integration)
app.use('/api/language', languageRoutes);

// Sync routes (ASHA Worker offline sync)
app.use('/api/sync', syncRoutes);

// ---- 404 handler ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Error handler ----
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Start server ----
app.listen(PORT, () => {
  const aiStatus = getAIStatus();
  const langStatus = getBhashiniStatus();
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  SmartMind Server');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Port:            ${PORT}`);
  console.log(`  CORS:            ${CORS_ORIGIN}`);
  console.log(`  AI Mode:         ${aiStatus.mode}`);
  console.log(`  AI Model:        ${aiStatus.model}`);
  console.log(`  AI Status:       ${aiStatus.message}`);
  console.log(`  Language Mode:   ${langStatus.mode}`);
  console.log(`  Language:        ${langStatus.message}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
