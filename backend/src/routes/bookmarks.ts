import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from '../models/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { BookmarkRow } from '../types';

const router = Router();
const PERF_LOG_PREFIX = '[BOOKMARK_PERF]';
const ICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ICON_FETCH_TIMEOUT_MS = 8000;

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

function normalizeTargetUrl(rawUrl: string): string {
  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
}

function getIconCacheKey(targetUrl: string): string {
  const urlObj = new URL(targetUrl);
  return urlObj.origin.toLowerCase();
}

function isGoogleFaviconUrl(rawUrl?: string | null): boolean {
  return !!rawUrl && rawUrl.includes('google.com/s2/favicons');
}

function absoluteUrl(baseUrl: string, maybeRelativeUrl: string): string {
  return new URL(maybeRelativeUrl, baseUrl).toString();
}

function buildCommonIconCandidates(targetUrl: string): string[] {
  const urlObj = new URL(targetUrl);
  return [
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
  ].map((pathname) => `${urlObj.origin}${pathname}`);
}

function isBlockedIconHost(targetUrl: string): boolean {
  const hostname = new URL(targetUrl).hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') return true;
  if (/^(127|10)\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

function dedupeUrls(urls: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawUrl of urls) {
    const nextUrl = rawUrl?.trim();
    if (!nextUrl || seen.has(nextUrl)) continue;
    seen.add(nextUrl);
    result.push(nextUrl);
  }

  return result;
}

function isUsableImageResponse(contentType: string | undefined, resourceUrl: string): boolean {
  const lowerType = (contentType || '').toLowerCase();
  if (lowerType.startsWith('image/')) return true;
  if (lowerType.includes('application/octet-stream')) {
    return /\.(ico|png|svg|jpg|jpeg|webp|gif)(\?|$)/i.test(resourceUrl);
  }
  return false;
}

function buildFallbackSvg(targetUrl: string): Buffer {
  let label = 'W';
  let accent = '#2563eb';

  try {
    const hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
    label = hostname.charAt(0).toUpperCase() || 'W';
    const palette = ['#2563eb', '#0891b2', '#059669', '#ea580c', '#db2777', '#7c3aed'];
    const codePoint = hostname.charCodeAt(0) || 0;
    accent = palette[codePoint % palette.length];
  } catch {
    // noop
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Website icon fallback">
      <rect width="64" height="64" rx="16" fill="${accent}"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">${label}</text>
    </svg>
  `.trim();

  return Buffer.from(svg, 'utf8');
}

async function fetchHtmlMetadata(targetUrl: string) {
  const response = await axios.get(targetUrl, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    maxRedirects: 10,
  });

  return cheerio.load(response.data);
}

function extractIconCandidates(targetUrl: string, $: cheerio.CheerioAPI): string[] {
  const selectors = [
    'link[rel="apple-touch-icon"][sizes="180x180"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"][sizes="16x16"]',
    'link[rel="shortcut icon"]',
    'link[rel="mask-icon"]',
    'link[rel="icon"]',
  ];

  const discovered = selectors
    .map((selector) => $(selector).attr('href'))
    .filter((href): href is string => !!href)
    .map((href) => absoluteUrl(targetUrl, href));

  return dedupeUrls([...discovered, ...buildCommonIconCandidates(targetUrl)]);
}

async function fetchMetadata(targetUrl: string): Promise<{ title?: string; icon?: string; description?: string }> {
  const $ = await fetchHtmlMetadata(targetUrl);

  let title =
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    '';

  const icon = extractIconCandidates(targetUrl, $)[0] || '';

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

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

async function fetchIconBinary(iconUrl: string): Promise<{ contentType: string; data: Buffer }> {
  const response = await axios.get<ArrayBuffer>(iconUrl, {
    responseType: 'arraybuffer',
    timeout: ICON_FETCH_TIMEOUT_MS,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const contentType = String(response.headers['content-type'] || '').split(';')[0].trim();
  if (!isUsableImageResponse(contentType, iconUrl)) {
    throw new Error(`Unsupported icon content type: ${contentType || 'unknown'}`);
  }

  return {
    contentType: contentType || 'image/x-icon',
    data: Buffer.from(response.data),
  };
}

async function resolveIconAsset(targetUrl: string, providedIconUrl?: string | null) {
  let metadataIcon: string | undefined;

  try {
    metadataIcon = (await fetchMetadata(targetUrl)).icon;
  } catch (error) {
    console.warn(`${PERF_LOG_PREFIX} metadata_icon_lookup_failed url=${targetUrl}`, error);
  }

  const candidateUrls = dedupeUrls([
    providedIconUrl && !isGoogleFaviconUrl(providedIconUrl) ? providedIconUrl : undefined,
    metadataIcon,
    ...buildCommonIconCandidates(targetUrl),
  ]);

  for (const candidateUrl of candidateUrls) {
    try {
      const asset = await fetchIconBinary(candidateUrl);
      return { iconUrl: candidateUrl, ...asset };
    } catch (error) {
      console.warn(`${PERF_LOG_PREFIX} icon_candidate_failed url=${targetUrl} candidate=${candidateUrl}`, error);
    }
  }

  return null;
}

type IconCacheRow = {
  cache_key: string;
  source_url: string;
  icon_url: string | null;
  content_type: string;
  icon_data: Buffer;
  updated_at: string;
};

function getCachedIcon(cacheKey: string): IconCacheRow | undefined {
  return db
    .prepare('SELECT cache_key, source_url, icon_url, content_type, icon_data, updated_at FROM icon_cache WHERE cache_key = ?')
    .get(cacheKey) as IconCacheRow | undefined;
}

function isFreshIconCache(row: IconCacheRow): boolean {
  const updatedAtMs = Date.parse(row.updated_at.replace(' ', 'T') + 'Z');
  return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs < ICON_CACHE_TTL_MS;
}

function upsertIconCache(cacheKey: string, sourceUrl: string, iconUrl: string | null, contentType: string, data: Buffer) {
  db.prepare(
    `
    INSERT INTO icon_cache (cache_key, source_url, icon_url, content_type, icon_data, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(cache_key) DO UPDATE SET
      source_url = excluded.source_url,
      icon_url = excluded.icon_url,
      content_type = excluded.content_type,
      icon_data = excluded.icon_data,
      updated_at = CURRENT_TIMESTAMP
    `
  ).run(cacheKey, sourceUrl, iconUrl, contentType, data);
}

function sendIcon(res: any, contentType: string, data: Buffer, maxAgeSeconds: number) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=86400`);
  res.send(data);
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
      const nextTitle = current.title === fallbackTitle ? metadata.title || current.title : current.title;
      const nextIcon =
        !current.icon || isGoogleFaviconUrl(current.icon) ? metadata.icon || current.icon || null : current.icon;
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
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const hasSearch = rawQuery.length > 0;
    const searchLike = `%${rawQuery.replace(/[%_]/g, '\\$&')}%`;
    const rawLimit = Number(req.query.limit);
    const rawOffset = Number(req.query.offset);
    const hasPagination = Number.isFinite(rawLimit) || Number.isFinite(rawOffset);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    let bookmarks: BookmarkRow[];
    let total = 0;

    const searchClause = hasSearch
      ? `
        AND (
          title LIKE ? ESCAPE '\\'
          OR url LIKE ? ESCAPE '\\'
          OR COALESCE(description, '') LIKE ? ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM json_each(bookmarks.tags)
            WHERE json_each.value LIKE ? ESCAPE '\\'
          )
        )
      `
      : '';

    if (tag) {
      const baseWhere = `
        FROM bookmarks
        WHERE user_id = ?
        AND EXISTS (
          SELECT 1
          FROM json_each(bookmarks.tags)
          WHERE json_each.value = ?
        )
        ${searchClause}
      `;

      if (hasPagination) {
        const stmt = db.prepare(`
          SELECT * ${baseWhere}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `);
        const countStmt = db.prepare(`SELECT COUNT(1) as total ${baseWhere}`);
        const params = hasSearch
          ? [req.user!.userId, tag, searchLike, searchLike, searchLike, searchLike]
          : [req.user!.userId, tag];
        bookmarks = stmt.all(...params, limit, offset) as BookmarkRow[];
        total = (countStmt.get(...params) as { total: number }).total;
      } else {
        const stmt = db.prepare(`
          SELECT * ${baseWhere}
          ORDER BY updated_at DESC
        `);
        const params = hasSearch
          ? [req.user!.userId, tag, searchLike, searchLike, searchLike, searchLike]
          : [req.user!.userId, tag];
        bookmarks = stmt.all(...params) as BookmarkRow[];
      }
    } else {
      const baseWhere = `
        FROM bookmarks
        WHERE user_id = ?
        ${searchClause}
      `;
      if (hasPagination) {
        const stmt = db.prepare(`
          SELECT * ${baseWhere}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `);
        const countStmt = db.prepare(`SELECT COUNT(1) as total ${baseWhere}`);
        const params = hasSearch
          ? [req.user!.userId, searchLike, searchLike, searchLike, searchLike]
          : [req.user!.userId];
        bookmarks = stmt.all(...params, limit, offset) as BookmarkRow[];
        total = (countStmt.get(...params) as { total: number }).total;
      } else {
        const stmt = db.prepare(`SELECT * ${baseWhere} ORDER BY updated_at DESC`);
        const params = hasSearch
          ? [req.user!.userId, searchLike, searchLike, searchLike, searchLike]
          : [req.user!.userId];
        bookmarks = stmt.all(...params) as BookmarkRow[];
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

    const targetUrl = normalizeTargetUrl(url);

    try {
      const metadata = await fetchMetadata(targetUrl);
      const urlObj = new URL(targetUrl);
      res.json({
        title: metadata.title || urlObj.hostname,
        icon: metadata.icon || '',
        description: metadata.description || '',
        url: targetUrl,
      });
    } catch {
      const urlObj = new URL(targetUrl);
      res.json({
        title: urlObj.hostname,
        icon: '',
        description: '',
        url: targetUrl,
      });
    }
  } catch (error) {
    console.error('Fetch metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

router.get('/icon', async (req, res) => {
  try {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const providedIconUrl = typeof req.query.icon === 'string' ? req.query.icon.trim() : '';

    if (!rawUrl) {
      return sendIcon(res, 'image/svg+xml; charset=utf-8', buildFallbackSvg('about:blank'), 3600);
    }

    const targetUrl = normalizeTargetUrl(rawUrl);
    if (isBlockedIconHost(targetUrl)) {
      return sendIcon(res, 'image/svg+xml; charset=utf-8', buildFallbackSvg(targetUrl), 3600);
    }
    const cacheKey = getIconCacheKey(targetUrl);
    const cached = getCachedIcon(cacheKey);

    if (cached && isFreshIconCache(cached)) {
      return sendIcon(res, cached.content_type, cached.icon_data, 86400);
    }

    const resolved = await resolveIconAsset(targetUrl, providedIconUrl || undefined);
    if (resolved) {
      upsertIconCache(cacheKey, targetUrl, resolved.iconUrl, resolved.contentType, resolved.data);
      return sendIcon(res, resolved.contentType, resolved.data, 86400);
    }

    if (cached) {
      return sendIcon(res, cached.content_type, cached.icon_data, 3600);
    }

    return sendIcon(res, 'image/svg+xml; charset=utf-8', buildFallbackSvg(targetUrl), 3600);
  } catch (error) {
    console.error('Fetch icon error:', error);
    return sendIcon(res, 'image/svg+xml; charset=utf-8', buildFallbackSvg('about:blank'), 300);
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

    url = normalizeTargetUrl(url);

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
    const fallbackIcon = icon?.trim() || null;

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
