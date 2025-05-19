/**
 * Redis Service
 *
 * This service provides a centralized Redis connection with health checks,
 * reconnection logic, and graceful degradation when Redis is unavailable.
 */
import { debug, info, warn, error } from '../shared/logger';
import { isError } from '../utils/errorUtils';
import { EventEmitter } from 'events';
import loadConfig from '../config/index';

// Redis client type
type Redis = any;

// Redis connection options
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  connectionTimeout?: number;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  healthCheckInterval?: number;
}

// Redis connection status
export type RedisConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Redis service events
export interface RedisServiceEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  healthCheck: (status: RedisConnectionStatus) => void;
}

// Default connection options
const DEFAULT_OPTIONS: Partial<RedisConnectionOptions> = {
  host: 'localhost',
  port: 6379,
  db: 0,
  tls: false,
  connectionTimeout: 10000, // 10 seconds
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000, // 1 second
  maxReconnectDelay: 30000, // 30 seconds
  healthCheckInterval: 30000, // 30 seconds
};

/**
 * Redis Service Class
 *
 * Provides a centralized Redis connection with health checks and reconnection logic
 */
export class RedisService extends EventEmitter {
  private client: Redis | null = null;
  private options: Required<RedisConnectionOptions>;
  private status: RedisConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private Redis: any;
  private inMemoryMode = false;

  constructor(options: Partial<RedisConnectionOptions> = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<RedisConnectionOptions>;
  }

  /**
   * Initialize the Redis service
   * @returns Whether Redis is available
   */
  async initialize(): Promise<boolean> {
    const startTime = Date.now();

    try {
      info('🔄 Initializing Redis service', {
        event: 'redis_service_initializing',
        timestamp: new Date().toISOString(),
      });

      // Load Redis configuration from config
      const config = await loadConfig();
      if (config.redis) {
        this.options = {
          ...this.options,
          host: config.redis.host || 'localhost',
          port: config.redis.port || 6379,
          password: config.redis.password,
          db: config.redis.db || 0,
          tls: config.redis.tls || false,
        };

        info('⚙️ Redis configuration loaded', {
          event: 'redis_config_loaded',
          timestamp: new Date().toISOString(),
          host: this.options.host,
          port: this.options.port,
          db: this.options.db,
          tls: this.options.tls,
        });
      } else {
        info('⚙️ Using default Redis configuration', {
          event: 'redis_using_default_config',
          timestamp: new Date().toISOString(),
          host: this.options.host,
          port: this.options.port,
          db: this.options.db,
          tls: this.options.tls,
        });
      }

      // Try to import ioredis
      try {
        info('📦 Importing ioredis module', {
          event: 'redis_importing_module',
          timestamp: new Date().toISOString(),
        });

        const RedisModule = await import('ioredis');
        this.Redis = RedisModule.default || RedisModule;

        info('✅ ioredis module imported successfully', {
          event: 'redis_module_imported',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        warn('ioredis module not found, falling back to in-memory mode', {
          event: 'redis_module_import_failed',
          timestamp: new Date().toISOString(),
        });
        this.inMemoryMode = true;
      }

      if (!this.inMemoryMode) {
        const connected = await this.connect();
        const durationMs = Date.now() - startTime;

        info(`Redis service initialization ${connected ? 'completed' : 'failed'} in ${durationMs}ms`, {
          event: 'redis_service_init_result',
          timestamp: new Date().toISOString(),
          durationMs,
          connected,
          inMemoryMode: this.inMemoryMode,
        });

        return connected;
      }

      info('Redis service running in in-memory mode', {
        event: 'redis_in_memory_mode',
        timestamp: new Date().toISOString(),
      });

      return false;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      error('Failed to initialize Redis service', {
        event: 'redis_service_init_error',
        timestamp: new Date().toISOString(),
        durationMs,
        error: isError(err) ? err.message : String(err),
        stack: isError(err) ? err.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Connect to Redis
   * @returns Whether the connection was successful
   */
  private async connect(): Promise<boolean> {
    if (this.inMemoryMode) {
      return false;
    }

    const startTime = Date.now();

    try {
      this.status = 'connecting';

      info('🔌 Connecting to Redis server', {
        event: 'redis_connecting',
        timestamp: new Date().toISOString(),
        host: this.options.host,
        port: this.options.port,
        tls: this.options.tls,
        db: this.options.db,
        connectionTimeout: this.options.connectionTimeout,
      });

      // Create Redis client
      this.client = new this.Redis({
        host: this.options.host,
        port: this.options.port,
        password: this.options.password,
        db: this.options.db,
        tls: this.options.tls ? {} : undefined,
        connectTimeout: this.options.connectionTimeout,
        retryStrategy: () => null, // Disable built-in retry, we'll handle it ourselves
      });

      // Set up event listeners
      this.client.on('connect', this.handleConnect.bind(this));
      this.client.on('error', this.handleError.bind(this));
      this.client.on('close', this.handleDisconnect.bind(this));

      debug('🔄 Redis event handlers registered', {
        event: 'redis_event_handlers_registered',
        timestamp: new Date().toISOString(),
      });

      // Wait for connection or timeout
      info('⏳ Waiting for Redis connection (timeout: ' + this.options.connectionTimeout + 'ms)', {
        event: 'redis_waiting_for_connection',
        timestamp: new Date().toISOString(),
        timeoutMs: this.options.connectionTimeout,
      });

      const connected = await this.waitForConnection();

      const totalDuration = Date.now() - startTime;

      if (connected) {
        info('✅ Connected to Redis in ' + totalDuration + 'ms', {
          event: 'redis_connection_successful',
          timestamp: new Date().toISOString(),
          durationMs: totalDuration,
          host: this.options.host,
          port: this.options.port,
        });
      } else {
        warn('⏱️ Redis connection timed out after ' + totalDuration + 'ms', {
          event: 'redis_connection_timeout',
          timestamp: new Date().toISOString(),
          durationMs: totalDuration,
          host: this.options.host,
          port: this.options.port,
          timeoutMs: this.options.connectionTimeout,
        });
      }

      return connected;
    } catch (err) {
      const totalDuration = Date.now() - startTime;

      error('❌ Failed to connect to Redis', {
        event: 'redis_connection_error',
        timestamp: new Date().toISOString(),
        durationMs: totalDuration,
        host: this.options.host,
        port: this.options.port,
        error: isError(err) ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      this.status = 'error';
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Wait for Redis connection
   * @returns Whether the connection was successful
   */
  private waitForConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.status !== 'connected') {
          warn('Redis connection timeout');
          this.status = 'error';
          resolve(false);
        }
      }, this.options.connectionTimeout);

      this.once('connected', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.once('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Handle Redis connect event
   */
  private handleConnect(): void {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    info('Connected to Redis');
    this.emit('connected');
  }

  /**
   * Handle Redis error event
   * @param err Error object
   */
  private handleError(err: Error): void {
    error('Redis error', {
      error: err.message,
      stack: err.stack,
    });
    this.emit('error', err);
  }

  /**
   * Handle Redis disconnect event
   */
  private handleDisconnect(): void {
    if (this.status === 'connected') {
      this.status = 'disconnected';
      warn('Disconnected from Redis');
      this.emit('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      error('Max reconnect attempts reached, giving up', {
        event: 'redis_max_reconnect_attempts',
        timestamp: new Date().toISOString(),
        timeoutMs: this.options.maxReconnectDelay,
      });
      this.inMemoryMode = true;
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts++;
    info(`Scheduling Redis reconnect attempt ${this.reconnectAttempts} in ${delay}ms`, {
      event: 'redis_reconnect_scheduled',
      timestamp: new Date().toISOString(),
      interval: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.emit('reconnecting', this.reconnectAttempts);
      this.connect().catch((err) => {
        error('Reconnect attempt failed', {
          event: 'redis_reconnect_failed',
          timestamp: new Date().toISOString(),
          durationMs: delay,
          host: this.options.host,
          port: this.options.port,
          error: isError(err) ? err.message : String(err),
          attempt: this.reconnectAttempts,
        });
      });
    }, delay);
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(
      this.checkHealth.bind(this),
      this.options.healthCheckInterval
    );

    debug(`Redis health check started with interval ${this.options.healthCheckInterval}ms`);
  }

  /**
   * Check Redis health
   * @returns Health check result
   */
  async checkHealth(): Promise<{ status: RedisConnectionStatus; latency?: number }> {
    if (this.inMemoryMode) {
      return { status: 'disconnected' };
    }

    if (!this.client) {
      return { status: 'disconnected' };
    }

    try {
      const startTime = Date.now();
      await this.client.ping();
      const latency = Date.now() - startTime;

      this.status = 'connected';
      this.emit('healthCheck', this.status);

      debug(`Redis health check: OK (${latency}ms)`, {
        event: 'redis_health_check',
        timestamp: new Date().toISOString(),
        durationMs: latency,
        host: this.options.host,
        port: this.options.port,
      });
      return { status: this.status, latency };
    } catch (err) {
      error('Redis health check failed', {
        event: 'redis_health_check_failed',
        timestamp: new Date().toISOString(),
        host: this.options.host,
        port: this.options.port,
        error: isError(err) ? err.message : String(err),
      });

      this.status = 'error';
      this.emit('healthCheck', this.status);

      // If we were previously connected, try to reconnect
      if (this.getStatus() === 'connected') {
        this.handleDisconnect();
      }

      return { status: this.status };
    }
  }

  /**
   * Get the Redis client
   * @returns Redis client or null if not connected
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Get the connection status
   * @returns Connection status
   */
  getStatus(): RedisConnectionStatus {
    return this.status;
  }

  /**
   * Check if Redis is available
   * @returns Whether Redis is available
   */
  isAvailable(): boolean {
    return this.status === 'connected' && this.client !== null;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
        info('Redis connection closed');
      } catch (err) {
        error('Error closing Redis connection', {
          error: isError(err) ? err.message : String(err),
        });
      } finally {
        this.client = null;
        this.status = 'disconnected';
      }
    }
  }
}

// Create and export a singleton instance
export const redisService = new RedisService();
