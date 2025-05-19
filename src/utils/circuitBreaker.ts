/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern to prevent repeated calls to failing services,
 * allowing them time to recover and preventing cascading failures.
 */
import { sql } from 'drizzle-orm';
import { db } from '../shared/db.js';
import { debug, info, warn, error } from '../shared/logger.js';
import { circuitBreakerState } from '../shared/schema.js';
// Circuit breaker states
export enum CircuitState {
  CLOSED = 'closed', // Normal operation, requests pass through
  OPEN = 'open', // Circuit is open, requests fail fast
  HALF_OPEN = 'half-open', // Testing if the service has recovered
}
/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in milliseconds to keep the circuit open before trying again (default: 30000) */
  resetTimeout?: number;
  /** Number of successful calls in half-open state to close the circuit (default: 2) */
  successThreshold?: number;
  /** Timeout in milliseconds for the protected function call (default: 10000) */
  timeout?: number;
  /** Function to determine if an error should count as a failure (default: all errors count) */
  isFailure?: (error: any) => boolean;
  /** Function to execute when the circuit state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  /** Whether to use in-memory state instead of database (default: false) */
  inMemory?: boolean;
}
/**
 * In-memory circuit breaker state storage
 */
const inMemoryCircuits = new Map<
  string,
  {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: number;
    lastSuccess: number;
  }
>();
/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private readonly name: string;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly inMemory: boolean;
  /**
   * Create a new circuit breaker
   *
   * @param name - Unique identifier for this circuit
   * @param options - Circuit breaker configuration
   */
  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.inMemory = options.inMemory || false;
    // Set default options
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout || 10000,
      isFailure: options.isFailure || (() => true),
      onStateChange: options.onStateChange || (() => {}),
      inMemory: this.inMemory,
    };
    // Initialize the circuit state if using in-memory storage
    if (this.inMemory && !inMemoryCircuits.has(this.name)) {
      inMemoryCircuits.set(this.name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: 0,
        lastSuccess: 0,
      });
    }
  }
  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - The async function to execute
   * @returns The result of the function if successful
   * @throws CircuitOpenError if the circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.getState();
    // If the circuit is open, check if it's time to try again
    if (state === CircuitState.OPEN) {
      const lastFailure = await this.getLastFailure();
      const timeInOpen = Date.now() - lastFailure;
      if (timeInOpen < this.options.resetTimeout) {
        throw new CircuitOpenError(
          `Circuit ${this.name} is OPEN for ${Math.round(timeInOpen / 1000)}s (resets after ${Math.round(this.options.resetTimeout / 1000)}s)`,
          this.name
        );
      }
      // Transition to half-open state
      await this.transitionTo(CircuitState.HALF_OPEN);
    }
    // Execute the function with a timeout
    try {
      const result = await this.executeWithTimeout(fn);
      await this.recordSuccess();
      return result;
    } catch (error) {
      if (this.options.isFailure(error)) {
        await this.recordFailure();
      }
      throw error;
    }
  }
  /**
   * Execute a function with a timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Circuit ${this.name} timed out after ${this.options.timeout}ms`)),
        this.options.timeout
      );
    });
    return Promise.race([fn(), timeoutPromise]);
  }
  /**
   * Get the current state of the circuit
   */
  async getState(): Promise<CircuitState> {
    if (this.inMemory) {
      const circuit = inMemoryCircuits.get(this.name);
      return circuit?.state || CircuitState.CLOSED;
    }
    try {
      const [result] = await db
        .select()
        .from(circuitBreakerState)
        .where(sql`name = ${this.name}`);
      if (!result) {
        await db.insert(circuitBreakerState).values({
          name: this.name,
          state: CircuitState.CLOSED,
        });
        return CircuitState.CLOSED;
      }
      return result.state as CircuitState;
    } catch (error) {
      error(`Error getting circuit state for ${this.name}:`, error);
      return CircuitState.CLOSED; // Default to closed on error
    }
  }
  /**
   * Transition the circuit to a new state
   */
  private async transitionTo(newState: CircuitState): Promise<void> {
    const currentState = await this.getState();
    if (currentState === newState) {
      return;
    }
    if (this.inMemory) {
      const circuit = inMemoryCircuits.get(this.name);
      if (circuit) {
        circuit.state = newState;
        if (newState === CircuitState.CLOSED) {
          circuit.failures = 0;
        } else if (newState === CircuitState.HALF_OPEN) {
          circuit.successes = 0;
        }
      }
    } else {
      try {
        await db
          .update(circuitBreakerState)
          .set({
            state: newState,
            updated_at: new Date(),
          })
          .where(sql`name = ${this.name}`);
      } catch (error) {
        error(`Error updating circuit state for ${this.name}:`, error);
      }
    }
    // Notify state change
    this.options.onStateChange(currentState, newState);
    info(`Circuit ${this.name} state changed from ${currentState} to ${newState}`);
  }
  /**
   * Record a successful execution
   */
  private async recordSuccess(): Promise<void> {
    const state = await this.getState();
    if (this.inMemory) {
      const circuit = inMemoryCircuits.get(this.name);
      if (circuit) {
        circuit.lastSuccess = Date.now();
        if (state === CircuitState.HALF_OPEN) {
          circuit.successes++;
          if (circuit.successes >= this.options.successThreshold) {
            await this.transitionTo(CircuitState.CLOSED);
          }
        }
      }
    } else {
      try {
        const [result] = await db
          .select()
          .from(circuitBreakerState)
          .where(sql`name = ${this.name}`);
        if (result?.successes !== undefined && result.successes >= this.options.successThreshold) {
          await this.transitionTo(CircuitState.CLOSED);
        } else {
          await db
            .update(circuitBreakerState)
            .set({
              successes: sql`successes + 1`,
              updated_at: new Date(),
            })
            .where(sql`name = ${this.name}`);
        }
      } catch (error) {
        error(`Error recording success for circuit ${this.name}:`, error);
      }
    }
  }
  /**
   * Record a failed execution
   */
  private async recordFailure(): Promise<void> {
    const state = await this.getState();
    if (state === CircuitState.OPEN) {
      return; // Already open, no need to record
    }
    if (this.inMemory) {
      const circuit = inMemoryCircuits.get(this.name);
      if (circuit) {
        circuit.failures++;
        circuit.lastFailure = Date.now();
        if (state === CircuitState.CLOSED && circuit.failures >= this.options.failureThreshold) {
          await this.transitionTo(CircuitState.OPEN);
        } else if (state === CircuitState.HALF_OPEN) {
          await this.transitionTo(CircuitState.OPEN);
        }
      }
    } else {
      try {
        const [result] = await db
          .select()
          .from(circuitBreakerState)
          .where(sql`name = ${this.name}`);
        if (result?.failures !== undefined && result.failures >= this.options.failureThreshold) {
          await this.transitionTo(CircuitState.OPEN);
          await db
            .update(circuitBreakerState)
            .set({
              last_failure_ms: Date.now(),
              updated_at: new Date(),
            })
            .where(sql`name = ${this.name}`);
        } else {
          await db
            .update(circuitBreakerState)
            .set({
              failures: sql`failures + 1`,
              updated_at: new Date(),
            })
            .where(sql`name = ${this.name}`);
        }
      } catch (error) {
        error(`Error recording failure for circuit ${this.name}:`, error);
      }
    }
  }
  /**
   * Get the timestamp of the last failure
   */
  private async getLastFailure(): Promise<number> {
    if (this.inMemory) {
      return inMemoryCircuits.get(this.name)?.lastFailure || 0;
    }
    try {
      const [result] = await db
        .select()
        .from(circuitBreakerState)
        .where(sql`name = ${this.name}`);
      return result?.last_failure_ms ?? 0;
    } catch (error) {
      error(`Error getting last failure for circuit ${this.name}:`, error);
      return 0;
    }
  }
  /**
   * Reset the circuit to closed state
   */
  async reset(): Promise<void> {
    if (this.inMemory) {
      inMemoryCircuits.set(this.name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: 0,
        lastSuccess: Date.now(),
      });
    } else {
      try {
        await db
          .update(circuitBreakerState)
          .set({
            state: CircuitState.CLOSED,
            failures: 0,
            successes: 0,
            last_failure_ms: 0,
            updated_at: new Date(),
          })
          .where(sql`name = ${this.name}`);
      } catch (error) {
        error(`Error resetting circuit ${this.name}:`, error);
      }
    }
    info(`Circuit ${this.name} has been reset to CLOSED state`);
  }
}
/**
 * Error thrown when a circuit is open
 */
export class CircuitOpenError extends Error {
  readonly circuitName: string;
  constructor(message: string, circuitName: string) {
    super(message);
    this.name = 'CircuitOpenError';
    this.circuitName = circuitName;
  }
}
