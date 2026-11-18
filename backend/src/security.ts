import { Request, Response, NextFunction } from 'express';

// In-Memory sliding window rate limiter
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < 60000);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  const xForwarded = req.headers['x-forwarded-for'];
  if (typeof xForwarded === 'string' && xForwarded.trim()) {
    return xForwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export function rateLimiter(options: { maxRequests: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const key = `${ip}:${req.baseUrl || req.path}`;

    let record = rateLimitStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter(ts => now - ts < options.windowMs);

    if (record.timestamps.length >= options.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Por favor intenta de nuevo en unos momentos.',
        retryAfterMs: options.windowMs
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

// OWASP Security Headers Middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // If request arrived via HTTPS (or Cloudflare SSL), send HSTS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
