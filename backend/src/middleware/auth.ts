import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

/**
 * Values that used to be shipped as the JWT secret. They are public knowledge
 * (this repository is public), so any token signed with them can be forged by
 * anyone. Treat them as "not configured" instead of silently signing with them.
 */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'your-super-secret-jwt-key-change-this-in-production',
  'dev-secret-key',
  'change-me',
  'secret',
]);

const MIN_SECRET_LENGTH = 32;

function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();

  if (configured && !KNOWN_PLACEHOLDER_SECRETS.has(configured)) {
    if (configured.length < MIN_SECRET_LENGTH) {
      console.warn(
        `[security] JWT_SECRET 只有 ${configured.length} 个字符，建议至少 ${MIN_SECRET_LENGTH} 位随机字符串。`
      );
    }
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      configured
        ? 'JWT_SECRET 仍然是公开的示例值，拒绝启动。请改成随机字符串（openssl rand -base64 48）。'
        : 'JWT_SECRET 未设置，拒绝在生产环境启动（否则任何人都能伪造登录令牌）。请设置 JWT_SECRET。'
    );
  }

  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn(
    '[security] JWT_SECRET 未设置（或仍是示例值）：已为本次开发进程生成临时密钥，重启后所有令牌会失效。'
  );
  return ephemeral;
}

const JWT_SECRET = resolveJwtSecret();

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
