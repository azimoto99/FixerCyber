import { NextFunction, Request, Response } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private store: RateLimitStore = {};
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use IP address as the key, but could be enhanced with user ID for authenticated requests
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.getKey(req);
    const now = Date.now();

    // Initialize or reset if window has passed
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.options.windowMs,
      };
    }

    // Increment request count
    this.store[key].count++;

    // Set rate limit headers
    const remaining = Math.max(0, this.options.maxRequests - this.store[key].count);
    const resetTime = Math.ceil((this.store[key].resetTime - now) / 1000);

    res.set({
      'X-RateLimit-Limit': this.options.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
    });

    // Check if limit exceeded
    if (this.store[key].count > this.options.maxRequests) {
      return res.status(429).json({
        error: this.options.message,
        retryAfter: resetTime,
      });
    }

    next();
  };
}

// Pre-configured rate limiters for different endpoints
export const generalRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
}).middleware;

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later.',
}).middleware;

export const gameActionRateLimit = new RateLimiter({
  windowMs: 1000, // 1 second
  maxRequests: 10, // 10 game actions per second
  message: 'Too many game actions, please slow down.',
}).middleware;

export const createRateLimit = (options: RateLimitOptions) => {
  return new RateLimiter(options).middleware;
};