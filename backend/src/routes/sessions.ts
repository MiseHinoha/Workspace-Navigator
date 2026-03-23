import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all sessions for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare(
      'SELECT id, device_name, last_active, active_workspace_id FROM sessions WHERE user_id = ? ORDER BY last_active DESC'
    );
    const sessions = stmt.all(req.user!.userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Create or update session
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { device_name, device_info, tabs, active_workspace_id, session_id } = req.body;
    const userId = req.user!.userId;

    let sessionId = session_id;

    if (sessionId) {
      // Update existing session
      const stmt = db.prepare(
        'UPDATE sessions SET device_name = ?, device_info = ?, tabs = ?, active_workspace_id = ?, last_active = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
      );
      stmt.run(
        device_name || null,
        device_info || null,
        JSON.stringify(tabs || []),
        active_workspace_id || null,
        sessionId,
        userId
      );
    } else {
      // Create new session
      sessionId = uuidv4();
      const stmt = db.prepare(
        'INSERT INTO sessions (id, user_id, device_name, device_info, tabs, active_workspace_id) VALUES (?, ?, ?, ?, ?, ?)'
      );
      stmt.run(
        sessionId,
        userId,
        device_name || null,
        device_info || null,
        JSON.stringify(tabs || []),
        active_workspace_id || null
      );
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    res.json({
      ...session,
      tabs: JSON.parse(session.tabs || '[]')
    });
  } catch (error) {
    console.error('Create/Update session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Get session details
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?');
    const session = stmt.get(id, userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      ...session,
      tabs: JSON.parse(session.tabs || '[]')
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Delete session
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const stmt = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
