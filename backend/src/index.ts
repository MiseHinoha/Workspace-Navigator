import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase, runWalCheckpoint } from './models/database';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import bookmarkRoutes from './routes/bookmarks';
import groupRoutes from './routes/groups';
import sessionRoutes from './routes/sessions';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
