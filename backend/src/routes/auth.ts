import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database';
import { generateToken, authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Check if registration is enabled
router.get('/registration-status', (req, res) => {
  try {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get('registration_enabled') as { value: string } | undefined;
    res.json({ enabled: row?.value === 'true' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get registration status' });
  }
});

// Toggle registration (admin only)
router.post('/toggle-registration', authMiddleware, adminMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { enabled } = req.body;
    const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
    stmt.run(enabled ? 'true' : 'false', 'registration_enabled');
    res.json({ enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle registration' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    // Check if registration is enabled
    const settingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const setting = settingStmt.get('registration_enabled') as { value: string } | undefined;
    
    if (setting?.value !== 'true') {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username must be at least 3 characters and password at least 6 characters' });
    }

    // Check if user exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    const existingUser = checkStmt.get(username);
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    const insertStmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
    insertStmt.run(userId, username, hashedPassword);

    // Generate token
    const token = generateToken({ userId, username, isAdmin: false });

    res.status(201).json({
      token,
      user: { id: userId, username, isAdmin: false }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get user
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as { id: string; username: string; password: string; is_admin: number } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ userId: user.id, username: user.username, isAdmin: user.is_admin === 1 });

    res.json({
      token,
      user: { id: user.id, username: user.username, isAdmin: user.is_admin === 1 }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?');
    const user = stmt.get(req.user!.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
