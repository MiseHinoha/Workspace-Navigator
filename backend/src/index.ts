// Load .env before anything reads process.env (JWT_SECRET is validated at
// import time of the auth middleware). Inside Docker the variables come from
// compose, so this is a no-op there.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, runWalCheckpoint, pruneSessions } from './models/database';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import bookmarkRoutes from './routes/bookmarks';
import groupRoutes from './routes/groups';
import sessionRoutes from './routes/sessions';
import backendPackageJson from '../package.json';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RELEASE_NOTES_URL =
  process.env.APP_RELEASE_NOTES_URL || 'https://github.com/MiseHinoha/Workspace-Navigator/releases';

type VersionPayload = {
  appName: string;
  version: string;
  buildId: string;
  releaseNotesUrl?: string;
};

function getVersionFileCandidates() {
  return [
    path.join(__dirname, '../public/version.json'),
    path.join(__dirname, '../../frontend/dist/version.json'),
  ];
}

function readVersionPayload(): VersionPayload {
  for (const candidate of getVersionFileCandidates()) {
    if (!fs.existsSync(candidate)) continue;

    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw) as Partial<VersionPayload>;
      if (parsed.appName && parsed.version && parsed.buildId) {
        return {
          appName: parsed.appName,
          version: parsed.version,
          buildId: parsed.buildId,
          releaseNotesUrl: parsed.releaseNotesUrl || RELEASE_NOTES_URL,
        };
      }
    } catch (error) {
      console.warn(`Failed to read version metadata from ${candidate}:`, error);
    }
  }

  return {
    appName: 'Workspace Navigator',
    version: process.env.APP_VERSION || backendPackageJson.version,
    buildId: process.env.APP_BUILD_ID || 'dev',
    releaseNotesUrl: RELEASE_NOTES_URL,
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();
runWalCheckpoint('TRUNCATE');

// Periodic WAL maintenance to prevent long-lived WAL growth on busy instances.
setInterval(() => {
  runWalCheckpoint('PASSIVE');
}, 10 * 60 * 1000);

// Session retention: keeps a client that never stores its session id (or a
// stale cached bundle) from growing the table without bound.
const SESSION_RETENTION_DAYS = Number(process.env.SESSION_RETENTION_DAYS || 30);
const prunedAtBoot = pruneSessions(SESSION_RETENTION_DAYS);
console.log(
  `[sessions] 保留 ${SESSION_RETENTION_DAYS} 天：启动时清理 ${prunedAtBoot} 条过期会话记录`
);
setInterval(() => {
  const removed = pruneSessions(SESSION_RETENTION_DAYS);
  if (removed > 0) {
    console.log(`[sessions] 定时清理 ${removed} 条过期会话记录`);
  }
}, 60 * 60 * 1000);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: NODE_ENV });
});

app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(readVersionPayload());
});

// Serve static files in production
if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../public');
  app.use(
    express.static(staticPath, {
      maxAge: '30d',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );
  
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});
