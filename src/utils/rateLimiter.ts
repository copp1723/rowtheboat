/**
 * Rate Limiter Utility
 * 
 * This utility provides a simple in-memory rate limiter for controlling
 * the rate of operations like API calls or IMAP requests.
 */
import { logger } from '../shared/logger.js';
/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed in the time window */
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Callback when limit is reached */
  onLimitReached?: () => void;
}
/**
 * Execute options
 */
export interface ExecuteOptions {
  /** Whether to wait for rate limit to clear */
  wait?: boolean;
  /** Maximum time to wait in milliseconds */
  maxWaitMs?: number;
}
interface WaitingPromise {
  resolve: () => void;
}
/**
 * Rate limiter for controlling the rate of operations
 */
export class RateLimiter {
  private name: string;
  private maxRequests: number;
  private windowMs: number;
  private onLimitReached: () => void;
  private requests: number[] = [];
  private paused: boolean = false;
  private waitingPromises: WaitingPromise[] = [];
  /**
   * Create a new rate limiter
   * 
   * @param name - Identifier for this rate limiter
   * @param options - Configuration options
   */
  constructor(name: string, options: RateLimiterOptions = {}) {
    this.name = name;
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // Default: 1 minute
    this.onLimitReached = options.onLimitReached || (() => {});
    logger.info(`Rate limiter "${name}" created: ${this.maxRequests} requests per ${this.windowMs}ms`);
  }
  /**
   * Check if the rate limit is currently exceeded
   * 
   * @returns True if rate limit is exceeded
   */
  public isLimitExceeded(): boolean {
    this._cleanOldRequests();
    return this.requests.length >= this.maxRequests;
  }
  /**
   * Execute a function with rate limiting
   * 
   * @param fn - The function to execute
   * @param options - Options
   * @returns Result of the function
   */
  public async execute<T>(fn: () => Promise<T>, options: ExecuteOptions = {}): Promise<T> {
    const wait = options.wait !== false;
    const maxWaitMs = options.maxWaitMs || 30000; // Default: 30 seconds
    // If paused and not waiting, reject immediately
    if (this.paused && !wait) {
      throw new Error(`Rate limiter "${this.name}" is paused`);
    }
    // Clean old requests
    this._cleanOldRequests();
    // Check if limit is exceeded
    if (this.isLimitExceeded() || this.paused) {
      if (!wait) {
        this.onLimitReached();
        throw new Error(`Rate limit exceeded for "${this.name}": ${this.maxRequests} requests per ${this.windowMs}ms`);
      }
      // Wait for rate limit to clear
      logger.info(`Rate limit for "${this.name}" reached, waiting...`);
      await this._waitForAvailability(maxWaitMs);
    }
    // Add current request
    this.requests.push(Date.now());
    try {
      // Execute the function
      return await fn();
    } finally {
      // Notify waiting promises if any
      this._notifyWaiting();
    }
  }
  /**
   * Pause the rate limiter
   * 
   * @param reason - Reason for pausing
   */
  public pause(reason: string = 'backpressure'): void {
    if (!this.paused) {
      this.paused = true;
      logger.warn(`Rate limiter "${this.name}" paused: ${reason}`);
    }
  }
  /**
   * Resume the rate limiter
   */
  public resume(): void {
    if (this.paused) {
      this.paused = false;
      logger.info(`Rate limiter "${this.name}" resumed`);
      this._notifyWaiting();
    }
  }
  /**
   * Clean old requests outside the current time window
   */
  private _cleanOldRequests(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(time => time > windowStart);
  }
  /**
   * Wait for rate limit availability
   * 
   * @param maxWaitMs - Maximum time to wait
   */
  private _waitForAvailability(maxWaitMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove this promise from waiting list
        this.waitingPromises = this.waitingPromises.filter(p => p.resolve !== resolve);
        reject(new Error(`Timed out waiting for rate limit availability after ${maxWaitMs}ms`));
      }, maxWaitMs);
      this.waitingPromises.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        }
      });
      // Check if we can resolve immediately
      if (!this.isLimitExceeded() && !this.paused) {
        this._notifyWaiting();
      }
    });
  }
  /**
   * Notify waiting promises if capacity is available
   */
  private _notifyWaiting(): void {
    if (this.waitingPromises.length === 0 || this.paused) {
      return;
    }
    this._cleanOldRequests();
    // Calculate how many requests we can process
    const available = Math.max(0, this.maxRequests - this.requests.length);
    // Resolve waiting promises up to available capacity
    const toResolve = this.waitingPromises.slice(0, available);
    this.waitingPromises = this.waitingPromises.slice(available);
    if (toResolve.length > 0) {
      logger.debug(`Resolving ${toResolve.length} waiting requests for "${this.name}"`);
      toResolve.forEach(p => p.resolve());
    }
  }
}
// Create common rate limiters
export const imapRateLimiter = new RateLimiter('imap-operations', {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  onLimitReached: () => {
    logger.warn('IMAP rate limit reached, throttling requests');
  }
});
export const emailProcessingRateLimiter = new RateLimiter('email-processing', {
  maxRequests: 50,
  windowMs: 60000, // 1 minute
  onLimitReached: () => {
    logger.warn('Email processing rate limit reached, throttling processing');
  }
});
