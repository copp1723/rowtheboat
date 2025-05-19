/**
 * Health Check Scheduler Tests
 *
 * Tests for the health check scheduler functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startAllHealthChecks, stopAllHealthChecks, getHealthCheckSchedule } from '../services/healthCheckScheduler';
import * as healthService from '../services/healthService';
import cron from 'node-cron';

// Mock dependencies
vi.mock('node-cron', () => {
  const mockSchedule = vi.fn();
  const mockStop = vi.fn();
  const mockValidate = vi.fn().mockReturnValue(true);

  return {
    default: {
      schedule: vi.fn(() => ({
        stop: mockStop
      })),
      validate: mockValidate
    }
  };
});

vi.mock('../services/healthService', () => ({
  runAllHealthChecks: vi.fn().mockResolvedValue([
    { status: 'ok', name: 'test1' },
    { status: 'warning', name: 'test2' },
    { status: 'error', name: 'test3' }
  ])
}));

vi.mock('../shared/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

describe('Health Check Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    stopAllHealthChecks();
  });

  it('should start health checks with default schedule', () => {
    // Act
    startAllHealthChecks();

    // Assert
    expect(cron.schedule).toHaveBeenCalledWith(
      '*/5 * * * *',
      expect.any(Function),
      expect.objectContaining({ scheduled: true, timezone: 'UTC' })
    );
    expect(getHealthCheckSchedule()).toBe('*/5 * * * *');
  });

  it('should start health checks with custom schedule', () => {
    // Arrange
    const customSchedule = '0 */2 * * *'; // Every 2 hours

    // Act
    startAllHealthChecks(customSchedule);

    // Assert
    expect(cron.schedule).toHaveBeenCalledWith(
      customSchedule,
      expect.any(Function),
      expect.objectContaining({ scheduled: true, timezone: 'UTC' })
    );
    expect(getHealthCheckSchedule()).toBe(customSchedule);
  });

  it('should validate cron expression and fall back to default if invalid', () => {
    // Arrange
    const invalidSchedule = 'invalid-cron';
    vi.mocked(cron.validate).mockReturnValueOnce(false);

    // Act
    startAllHealthChecks(invalidSchedule);

    // Assert
    expect(cron.validate).toHaveBeenCalledWith(invalidSchedule);
    expect(cron.schedule).toHaveBeenCalledWith(
      '*/5 * * * *', // Default schedule
      expect.any(Function),
      expect.objectContaining({ scheduled: true, timezone: 'UTC' })
    );
  });

  it('should stop health checks when requested', () => {
    // Arrange
    const mockStop = vi.fn();
    vi.mocked(cron.schedule).mockReturnValueOnce({ stop: mockStop } as any);
    startAllHealthChecks();

    // Act
    stopAllHealthChecks();

    // Assert
    expect(mockStop).toHaveBeenCalled();
    expect(getHealthCheckSchedule()).toBeNull();
  });

  it('should run health checks when triggered', async () => {
    // Arrange
    let scheduledCallback: Function | null = null;

    vi.mocked(cron.schedule).mockImplementation((schedule, callback) => {
      scheduledCallback = callback as Function;
      return { stop: vi.fn() };
    });

    startAllHealthChecks();

    // Act
    if (scheduledCallback) {
      await scheduledCallback();
    }

    // Assert
    expect(healthService.runAllHealthChecks).toHaveBeenCalled();
  });
});
