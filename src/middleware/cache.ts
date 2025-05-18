/**
 * API Response Caching Middleware
 * 
 * This middleware caches API responses to improve performance.
 */
import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

// Initialize cache with default TTL of 5 minutes and check period of 1 minute
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

// Cache options interface
interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
}

/**
 * Generate a cache key from the request
 * 
 * @param req Express request
 * @returns Cache key
 */
function defaultKeyGenerator(req: Request): string {
  return `${req.method}:${req.originalUrl}`;
}

/**
 * Determine if a request should be cached
 * 
 * @param req Express request
 * @param res Express response
 * @returns Whether the request should be cached
 */
function defaultShouldCache(req: Request, res: Response): boolean {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }

  // Don't cache requests with query parameters that bypass cache
  if (req.query.noCache === 'true' || req.query.refresh === 'true') {
    return false;
  }

  // Don't cache authenticated requests by default
  if (req.headers.authorization) {
    return false;
  }

  return true;
}

/**
 * API response caching middleware
 * 
 * @param options Cache options
 * @returns Express middleware
 */
export function cacheMiddleware(options: CacheOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const ttl = options.ttl || 300; // Default TTL: 5 minutes
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const shouldCache = options.shouldCache || defaultShouldCache;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching if shouldCache returns false
    if (!shouldCache(req, res)) {
      return next();
    }

    // Generate cache key
    const key = keyGenerator(req);

    // Check if response is cached
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      // Set cache hit header
      res.setHeader('X-Cache', 'HIT');
      
      // Send cached response
      return res.status(200).send(cachedResponse);
    }

    // Set cache miss header
    res.setHeader('X-Cache', 'MISS');

    // Store original send method
    const originalSend = res.send;

    // Override send method to cache response
    res.send = function(body): Response {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }

      // Call original send method
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Clear a specific cache key
 * 
 * @param key Cache key to clear
 * @returns True if the key was found and cleared, false otherwise
 */
export function clearCacheKey(key: string): boolean {
  return cache.del(key) > 0;
}

/**
 * Get cache statistics
 * 
 * @returns Cache statistics
 */
export function getCacheStats(): any {
  return {
    keys: cache.keys(),
    stats: cache.getStats(),
    size: cache.keys().length,
  };
}
