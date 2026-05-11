import { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100");

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  if (!store[ip] || now > store[ip].resetTime) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    return next();
  }

  store[ip].count++;

  if (store[ip].count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests, please try again later.",
    });
  }

  next();
};
