import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all workspaces for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE user_id = ? ORDER BY sort_order ASC');
    const workspaces = stmt.all(req.user!.userId);
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Create workspace
router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const userId = req.user!.userId;

    // Get max sort_order
    const maxOrderStmt = db.prepare('SELECT MAX(sort_order) as max_order FROM workspaces WHERE user_id = ?');
    const result = maxOrderStmt.get(userId) as { max_order: number | null };
    const sortOrder = (result.max_order || 0) + 1;

    const stmt = db.prepare(
      'INSERT INTO workspaces (id, user_id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, userId, name, description || null, icon || null, sortOrder);

    const newWorkspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    res.status(201).json(newWorkspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Update workspace
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, sort_order } = req.body;
    const userId = req.user!.userId;

    // Check ownership
    const checkStmt = db.prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const stmt = db.prepare(
      'UPDATE workspaces SET name = ?, description = ?, icon = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      icon !== undefined ? icon : existing.icon,
      sort_order !== undefined ? sort_order : existing.sort_order,
      id
    );

    const updated = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check ownership
    const checkStmt = db.prepare('SELECT id FROM workspaces WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?');
    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Get pinned cards for a workspace (optionally filtered by group)
router.get('/:id/cards', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { group_id } = req.query;
    const userId = req.user!.userId;

    let query = `
      SELECT pc.*, b.title, b.url, b.description, b.icon, b.tags
      FROM pinned_cards pc
      JOIN bookmarks b ON pc.bookmark_id = b.id
      WHERE pc.workspace_id = ? AND pc.user_id = ?
    `;
    
    const params: any[] = [id, userId];
    
    if (group_id === 'null') {
      query += ` AND pc.group_id IS NULL`;
    } else if (group_id) {
      query += ` AND pc.group_id = ?`;
      params.push(group_id);
    }
    
    query += ` ORDER BY pc.sort_order ASC`;

    const stmt = db.prepare(query);
    const cards = stmt.all(...params);
    
    // Parse tags
    const parsedCards = cards.map((card: any) => ({
      ...card,
      tags: JSON.parse(card.tags || '[]')
    }));
    
    res.json(parsedCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pinned cards' });
  }
});

// Pin a bookmark to workspace
router.post('/:id/cards', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { bookmark_id, group_id } = req.body;
    const userId = req.user!.userId;

    if (!bookmark_id) {
      return res.status(400).json({ error: 'Bookmark ID is required' });
    }

    // Get max sort_order
    const maxOrderStmt = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM pinned_cards WHERE workspace_id = ? AND (group_id = ? OR (group_id IS NULL AND ? IS NULL))'
    );
    const result = maxOrderStmt.get(id, group_id || null, group_id || null) as { max_order: number | null };
    const sortOrder = (result.max_order || 0) + 1;

    const cardId = uuidv4();
    const stmt = db.prepare(
      'INSERT INTO pinned_cards (id, workspace_id, bookmark_id, user_id, group_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(cardId, id, bookmark_id, userId, group_id || null, sortOrder);

    const newCard = db.prepare('SELECT * FROM pinned_cards WHERE id = ?').get(cardId);
    res.status(201).json(newCard);
  } catch (error) {
    console.error('Pin card error:', error);
    res.status(500).json({ error: 'Failed to pin card' });
  }
});

// Update card (position, group, etc.)
router.put('/:workspaceId/cards/:cardId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { cardId } = req.params;
    const { group_id, sort_order } = req.body;
    const userId = req.user!.userId;

    const checkStmt = db.prepare('SELECT * FROM pinned_cards WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(cardId, userId) as any;
    
    if (!existing) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const stmt = db.prepare(
      'UPDATE pinned_cards SET group_id = ?, sort_order = ? WHERE id = ?'
    );
    stmt.run(
      group_id !== undefined ? (group_id || null) : existing.group_id,
      sort_order !== undefined ? sort_order : existing.sort_order,
      cardId
    );

    const updated = db.prepare('SELECT * FROM pinned_cards WHERE id = ?').get(cardId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Remove pinned card
router.delete('/:workspaceId/cards/:cardId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user!.userId;

    const stmt = db.prepare('DELETE FROM pinned_cards WHERE id = ? AND user_id = ?');
    stmt.run(cardId, userId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove pinned card' });
  }
});

export default router;
