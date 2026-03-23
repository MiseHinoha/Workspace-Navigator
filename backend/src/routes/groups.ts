import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all groups for a workspace
router.get('/workspace/:workspaceId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = req.params;
    const stmt = db.prepare('SELECT * FROM groups WHERE workspace_id = ? AND user_id = ? ORDER BY sort_order ASC');
    const groups = stmt.all(workspaceId, req.user!.userId);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Create group
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { workspace_id, name, description } = req.body;
    
    if (!workspace_id || !name) {
      return res.status(400).json({ error: 'Workspace ID and name are required' });
    }

    const id = uuidv4();
    const userId = req.user!.userId;

    // Get max sort_order
    const maxOrderStmt = db.prepare('SELECT MAX(sort_order) as max_order FROM groups WHERE workspace_id = ?');
    const result = maxOrderStmt.get(workspace_id) as { max_order: number | null };
    const sortOrder = (result.max_order || 0) + 1;

    const stmt = db.prepare(
      'INSERT INTO groups (id, workspace_id, user_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, workspace_id, userId, name, description || null, sortOrder);

    const newGroup = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order } = req.body;
    const userId = req.user!.userId;

    const checkStmt = db.prepare('SELECT * FROM groups WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId) as any;
    
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const stmt = db.prepare(
      'UPDATE groups SET name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      sort_order !== undefined ? sort_order : existing.sort_order,
      id
    );

    const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const checkStmt = db.prepare('SELECT id FROM groups WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

export default router;
