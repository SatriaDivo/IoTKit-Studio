import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Development: very permissive. Production: tighten these values.
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"); // 1 minute
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "500"); // 500 per minute

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests, please try again later.",
    });
  }

  next();
};
