import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { BookmarkRow } from '../types';

const router = Router();
const PERF_LOG_PREFIX = '[BOOKMARK_PERF]';

const metadataMetrics = {
  total: 0,
  success: 0,
  fail: 0,
  totalDurationMs: 0,
};

setInterval(() => {
  if (metadataMetrics.total === 0) return;
  const avgDuration = Math.round(metadataMetrics.totalDurationMs / metadataMetrics.total);
  const successRate = ((metadataMetrics.success / metadataMetrics.total) * 100).toFixed(1);
  console.log(
    `${PERF_LOG_PREFIX} metadata_summary total=${metadataMetrics.total} success=${metadataMetrics.success} fail=${metadataMetrics.fail} success_rate=${successRate}% avg_ms=${avgDuration}`
  );
}, 5 * 60 * 1000);

function normalizeBookmarkUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${hostname}${pathname}`;
  } catch {
    return rawUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
}

function parseTagsSafely(tagsJson: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(tagsJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toPublicBookmark(row: BookmarkRow) {
  const { normalized_url: _normalizedUrl, ...rest } = row as BookmarkRow & { normalized_url?: string };
  return {
    ...rest,
    tags: parseTagsSafely(row.tags),
    is_frequent: !!row.is_frequent,
    frequent_order: row.frequent_order || 0,
  };
}

async function fetchMetadata(targetUrl: string): Promise<{ title?: string; icon?: string; description?: string }> {
  const response = await axios.get(targetUrl, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    maxRedirects: 10,
  });

  const $ = cheerio.load(response.data);

  let title =
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    '';

  let icon =
    $('link[rel="apple-touch-icon"][sizes="180x180"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href') ||
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('meta[property="og:image"]').attr('content') ||
    '';

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  if (icon && !icon.startsWith('http')) {
    const urlObj = new URL(targetUrl);
    if (icon.startsWith('/')) {
      icon = `${urlObj.protocol}//${urlObj.host}${icon}`;
    } else if (icon.startsWith('./')) {
      icon = `${urlObj.protocol}//${urlObj.host}${icon.slice(1)}`;
    } else {
      icon = `${urlObj.protocol}//${urlObj.host}/${icon}`;
    }
  }

  if (title) {
    try {
      const urlObj = new URL(targetUrl);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      title = title.replace(new RegExp(`\\s*[-|]\\s*${hostname.replace(/\./g, '\\\\.')}\\s*$`, 'i'), '').trim();
    } catch {
      // noop
    }
  }

  return { title: title || undefined, icon: icon || undefined, description: description || undefined };
}

function queueMetadataEnrichment(bookmarkId: string, url: string) {
  setImmediate(async () => {
    const startAt = Date.now();
    metadataMetrics.total += 1;
    try {
      const metadata = await fetchMetadata(url);
      const urlObj = new URL(url);

      const current = db
        .prepare('SELECT title, icon, description, url FROM bookmarks WHERE id = ?')
        .get(bookmarkId) as { title: string; icon: string | null; description: string | null; url: string } | undefined;

      if (!current) return;

      const fallbackTitle = urlObj.hostname.replace(/^www\./, '');
      const fallbackIcon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;

      const nextTitle = current.title === fallbackTitle ? metadata.title || current.title : current.title;
      const nextIcon = !current.icon || current.icon === fallbackIcon ? metadata.icon || fallbackIcon : current.icon;
      const nextDescription = !current.description ? metadata.description || current.description : current.description;

      db.prepare(
        'UPDATE bookmarks SET title = ?, icon = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(nextTitle, nextIcon, nextDescription || null, bookmarkId);
      const duration = Date.now() - startAt;
      metadataMetrics.success += 1;
      metadataMetrics.totalDurationMs += duration;
      console.log(`${PERF_LOG_PREFIX} metadata_enrichment success bookmark_id=${bookmarkId} duration_ms=${duration}`);
    } catch (error) {
      const duration = Date.now() - startAt;
      metadataMetrics.fail += 1;
      metadataMetrics.totalDurationMs += duration;
      console.warn(`${PERF_LOG_PREFIX} metadata_enrichment fail bookmark_id=${bookmarkId} duration_ms=${duration}`, error);
    }
  });
}

router.get('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { tag } = req.query;
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const hasPagination = Number.isFinite(rawLimit) || Number.isFinite(rawOffset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    let bookmarks: BookmarkRow[];
    let total = 0;

    if (tag) {
      const baseWhere = `
        FROM bookmarks
        WHERE user_id = ?
        AND json_array_contains(tags, ?)
      `;

      if (hasPagination) {
        const stmt = db.prepare(`
          SELECT * ${baseWhere}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `);
        const countStmt = db.prepare(`SELECT COUNT(1) as total ${baseWhere}`);
        bookmarks = stmt.all(req.user!.userId, tag, limit, offset) as BookmarkRow[];
        total = (countStmt.get(req.user!.userId, tag) as { total: number }).total;
      } else {
        const stmt = db.prepare(`
          SELECT * ${baseWhere}
          ORDER BY updated_at DESC
        `);
        bookmarks = stmt.all(req.user!.userId, tag) as BookmarkRow[];
      }
    } else {
      if (hasPagination) {
        const stmt = db.prepare(`
          SELECT * FROM bookmarks
          WHERE user_id = ?
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `);
        const countStmt = db.prepare('SELECT COUNT(1) as total FROM bookmarks WHERE user_id = ?');
        bookmarks = stmt.all(req.user!.userId, limit, offset) as BookmarkRow[];
        total = (countStmt.get(req.user!.userId) as { total: number }).total;
      } else {
        const stmt = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY updated_at DESC');
        bookmarks = stmt.all(req.user!.userId) as BookmarkRow[];
      }
    }

    const items = bookmarks.map(toPublicBookmark);
    if (hasPagination) {
      return res.json({
        items,
        total,
        limit,
        offset,
        has_more: offset + items.length < total,
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

router.get('/fetch-metadata', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url;
    }

    try {
      const metadata = await fetchMetadata(targetUrl);
      const urlObj = new URL(targetUrl);
      res.json({
        title: metadata.title || urlObj.hostname,
        icon: metadata.icon || `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`,
        description: metadata.description || '',
        url: targetUrl,
      });
    } catch {
      const urlObj = new URL(targetUrl);
      res.json({
        title: urlObj.hostname,
        icon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`,
        description: '',
        url: targetUrl,
      });
    }
  } catch (error) {
    console.error('Fetch metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

router.get('/tags', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT tags FROM bookmarks WHERE user_id = ?');
    const rows = stmt.all(req.user!.userId) as { tags: string }[];

    const allTags = new Set<string>();
    rows.forEach((row) => {
      parseTagsSafely(row.tags).forEach((tag) => allTags.add(tag));
    });

    res.json(Array.from(allTags).sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

router.get('/frequent', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND is_frequent = 1 ORDER BY frequent_order ASC');
    const bookmarks = stmt.all(req.user!.userId) as BookmarkRow[];
    res.json(bookmarks.map(toPublicBookmark));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get frequent bookmarks' });
  }
});

router.post('/', authMiddleware, (req: AuthenticatedRequest, res) => {
  const requestStart = Date.now();
  let resultCode = 201;
  try {
    let { title, url, description, icon, tags, is_frequent } = req.body;

    if (!url) {
      resultCode = 400;
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const userId = req.user!.userId;
    const normalizedUrl = normalizeBookmarkUrl(url);

    const duplicate = db
      .prepare('SELECT id, title, url FROM bookmarks WHERE user_id = ? AND normalized_url = ? LIMIT 1')
      .get(userId, normalizedUrl) as { id: string; title: string; url: string } | undefined;

    if (duplicate) {
      resultCode = 409;
      return res.status(409).json({
        error: 'Bookmark already exists',
        bookmark: duplicate,
      });
    }

    const id = uuidv4();
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    let frequentOrder = 0;
    if (is_frequent) {
      const maxStmt = db.prepare('SELECT MAX(frequent_order) as max_order FROM bookmarks WHERE user_id = ? AND is_frequent = 1');
      const result = maxStmt.get(userId) as { max_order: number | null };
      frequentOrder = (result.max_order || 0) + 1;
    }

    const urlObj = new URL(url);
    const fallbackTitle = title?.trim() || urlObj.hostname.replace(/^www\./, '');
    const fallbackIcon = icon?.trim() || `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;

    db.prepare(
      `INSERT INTO bookmarks
      (id, user_id, title, url, normalized_url, description, icon, tags, is_frequent, frequent_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      fallbackTitle,
      url,
      normalizedUrl,
      description || null,
      fallbackIcon,
      tagsJson,
      is_frequent ? 1 : 0,
      frequentOrder
    );

    const newBookmark = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow;

    const needsEnrichment = !title || !icon || !description;
    if (needsEnrichment) {
      queueMetadataEnrichment(id, url);
    }

    res.status(201).json(toPublicBookmark(newBookmark));
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      resultCode = 409;
      return res.status(409).json({ error: 'Bookmark already exists' });
    }

    resultCode = 500;
    console.error('Create bookmark error:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  } finally {
    const duration = Date.now() - requestStart;
    const userId = req.user?.userId || 'unknown';
    console.log(`${PERF_LOG_PREFIX} create_bookmark user_id=${userId} status=${resultCode} duration_ms=${duration}`);
  }
});

router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, url, description, icon, tags, is_frequent, frequent_order } = req.body;
    const userId = req.user!.userId;

    const checkStmt = db.prepare('SELECT * FROM bookmarks WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId) as BookmarkRow | undefined;

    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const nextUrl = url !== undefined ? url : existing.url;
    const normalizedUrl = normalizeBookmarkUrl(nextUrl);

    const tagsJson = JSON.stringify(tags !== undefined ? tags : parseTagsSafely(existing.tags));
    const isFrequent = is_frequent !== undefined ? (is_frequent ? 1 : 0) : existing.is_frequent;
    const newFrequentOrder = frequent_order !== undefined ? frequent_order : existing.frequent_order;

    db.prepare(
      `UPDATE bookmarks
       SET title = ?, url = ?, normalized_url = ?, description = ?, icon = ?, tags = ?, is_frequent = ?, frequent_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      title !== undefined ? title : existing.title,
      nextUrl,
      normalizedUrl,
      description !== undefined ? description : existing.description,
      icon !== undefined ? icon : existing.icon,
      tagsJson,
      isFrequent,
      newFrequentOrder,
      id
    );

    const updated = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow;
    res.json(toPublicBookmark(updated));
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Bookmark already exists' });
    }

    console.error('Update bookmark error:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const checkStmt = db.prepare('SELECT id FROM bookmarks WHERE id = ? AND user_id = ?');
    const existing = checkStmt.get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    db.prepare('DELETE FROM pinned_cards WHERE bookmark_id = ?').run(id);
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

export default router;
