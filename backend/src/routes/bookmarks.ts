import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { BookmarkRow } from '../types';

const router = Router();

// Get all bookmarks for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { tag } = req.query;
    let bookmarks;

    if (tag) {
      // Filter by tag (SQLite JSON contains)
      const stmt = db.prepare(`
        SELECT * FROM bookmarks 
        WHERE user_id = ? 
        AND json_array_contains(tags, ?)
        ORDER BY updated_at DESC
      `);
      bookmarks = stmt.all(req.user!.userId, tag);
    } else {
      const stmt = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY updated_at DESC');
      bookmarks = stmt.all(req.user!.userId);
    }

    // Parse tags
    const parsedBookmarks = (bookmarks as any[]).map(b => ({
      ...b,
      tags: JSON.parse(b.tags || '[]')
    }));

    res.json(parsedBookmarks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

// Fetch website metadata (title, icon) from URL
router.get('/fetch-metadata', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Ensure URL has protocol
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url;
    }

    try {
      const response = await axios.get(targetUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Get title
      const title = $('title').text().trim() || 
                    $('meta[property="og:title"]').attr('content') || 
                    $('meta[name="twitter:title"]').attr('content') || 
                    '';
      
      // Get icon
      let icon = $('link[rel="icon"]').attr('href') || 
                 $('link[rel="shortcut icon"]').attr('href') || 
                 $('link[rel="apple-touch-icon"]').attr('href') ||
                 $('meta[property="og:image"]').attr('content') ||
                 '';
      
      // Convert relative icon URL to absolute
      if (icon && !icon.startsWith('http')) {
        const urlObj = new URL(targetUrl);
        if (icon.startsWith('/')) {
          icon = `${urlObj.protocol}//${urlObj.host}${icon}`;
        } else {
          icon = `${urlObj.protocol}//${urlObj.host}/${icon}`;
        }
      }
      
      // Get description
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         '';

      res.json({
        title: title || new URL(targetUrl).hostname,
        icon: icon || '',
        description: description || '',
        url: targetUrl
      });
    } catch (fetchError) {
      // If fetching fails, return basic info from URL
      const urlObj = new URL(targetUrl);
      res.json({
        title: urlObj.hostname,
        icon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`,
        description: '',
        url: targetUrl
      });
    }
  } catch (error) {
    console.error('Fetch metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Get all tags for current user
router.get('/tags', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT tags FROM bookmarks WHERE user_id = ?');
    const rows = stmt.all(req.user!.userId) as { tags: string }[];
    
    const allTags = new Set<string>();
    rows.forEach(row => {
      const tags = JSON.parse(row.tags || '[]');
      tags.forEach((tag: string) => allTags.add(tag));
    });

    res.json(Array.from(allTags).sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Get frequent bookmarks for current user
router.get('/frequent', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND is_frequent = 1 ORDER BY frequent_order ASC');
    const bookmarks = stmt.all(req.user!.userId);
    
    // Parse tags
    const parsedBookmarks = (bookmarks as any[]).map(b => ({
      ...b,
      tags: JSON.parse(b.tags || '[]')
    }));

    res.json(parsedBookmarks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get frequent bookmarks' });
  }
});

// Create bookmark
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    let { title, url, description, icon, tags, is_frequent } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Auto-fetch metadata if title or icon is empty
    if (!title || !icon) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        
        if (!title) {
          title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  new URL(url).hostname;
        }
        
        if (!icon) {
          icon = $('link[rel="icon"]').attr('href') || 
                 $('link[rel="shortcut icon"]').attr('href') || 
                 $('link[rel="apple-touch-icon"]').attr('href');
          
          // Convert relative icon URL to absolute
          if (icon && !icon.startsWith('http')) {
            const urlObj = new URL(url);
            if (icon.startsWith('/')) {
              icon = `${urlObj.protocol}//${urlObj.host}${icon}`;
            } else {
              icon = `${urlObj.protocol}//${urlObj.host}/${icon}`;
            }
          }
          
          // Fallback to Google favicon service
          if (!icon) {
            const urlObj = new URL(url);
            icon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
          }
        }
        
        if (!description) {
          description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';
        }
      } catch (fetchError) {
        // If fetching fails, use fallback values
        if (!title) {
          title = new URL(url).hostname;
        }
        if (!icon) {
          const urlObj = new URL(url);
          icon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
        }
      }
    }

    const id = uuidv4();
    const userId = req.user!.userId;
    const tagsJson = JSON.stringify(tags || []);

    // Get max frequent_order if marking as frequent
    let frequentOrder = 0;
    if (is_frequent) {
      const maxStmt = db.prepare('SELECT MAX(frequent_order) as max_order FROM bookmarks WHERE user_id = ? AND is_frequent = 1');
      const result = maxStmt.get(userId) as { max_order: number | null };
      frequentOrder = (result.max_order || 0) + 1;
    }

    const stmt = db.prepare(
      'INSERT INTO bookmarks (id, user_id, title, url, description, icon, tags, is_frequent, frequent_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, userId, title, url, description || null, icon || null, tagsJson, is_frequent ? 1 : 0, frequentOrder);

    const newBookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow;
    res.status(201).json({
      ...newBookmark,
      tags: tags || []
    });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

// Update bookmark
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, url, description, icon, tags, is_frequent, frequent_order } = req.body;
    const userId = req.user!.userId;

    // Check ownership
    const checkStmt = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId) as any;
    
    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const tagsJson = JSON.stringify(tags !== undefined ? tags : JSON.parse(existing.tags || '[]'));
    const isFrequent = is_frequent !== undefined ? (is_frequent ? 1 : 0) : existing.is_frequent;
    const newFrequentOrder = frequent_order !== undefined ? frequent_order : existing.frequent_order;

    const stmt = db.prepare(
      'UPDATE bookmarks SET title = ?, url = ?, description = ?, icon = ?, tags = ?, is_frequent = ?, frequent_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(
      title !== undefined ? title : existing.title,
      url !== undefined ? url : existing.url,
      description !== undefined ? description : existing.description,
      icon !== undefined ? icon : existing.icon,
      tagsJson,
      isFrequent,
      newFrequentOrder,
      id
    );

    const updated = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow;
    res.json({
      ...updated,
      tags: JSON.parse(updated.tags || '[]')
    });
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// Delete bookmark
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check ownership
    const checkStmt = db.prepare('SELECT id FROM bookmarks WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);
    
    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    // Delete pinned cards first
    const deleteCardsStmt = db.prepare('DELETE FROM pinned_cards WHERE bookmark_id = ?');
    deleteCardsStmt.run(id);

    const stmt = db.prepare('DELETE FROM bookmarks WHERE id = ?');
    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

export default router;
