#!/bin/bash
set -e

echo "Creating stub implementations for missing modules..."

# Create src/shared/db.js stub
mkdir -p src/shared
cat > src/shared/db.js << 'EOL'
/**
 * Database Connection Module (STUB)
 * 
 * This is a stub implementation to fix TypeScript errors.
 * Replace with actual implementation.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { debug, info, warn, error } from './logger.js';
import * as schema from './schema.js';

// Create a PostgreSQL client
const client = postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/rowtheboat');

// Create a drizzle database instance
export const db = drizzle(client, { schema });

// Export the client for direct usage if needed
export const pgClient = client;

// Close database connections on process exit
process.on('SIGINT', () => {
  info('SIGINT received, closing database connection');
  client.end();
});

process.on('SIGTERM', () => {
  info('SIGTERM received, closing database connection');
  client.end();
});
EOL

# Create src/middleware/swagger.js stub
mkdir -p src/middleware
cat > src/middleware/swagger.js << 'EOL'
/**
 * Swagger Middleware (STUB)
 * 
 * This is a stub implementation to fix TypeScript errors.
 * Replace with actual implementation.
 */
import { debug, info, warn, error } from '../shared/logger.js';

/**
 * Set up Swagger documentation
 * @param {import('express').Application} app - Express application
 */
export function setupSwagger(app) {
  info('Swagger documentation setup (STUB)');
  
  // This is a stub implementation
  // Replace with actual Swagger setup
  
  return app;
}
EOL

# Create src/services/taskParser.js stub
mkdir -p src/services
cat > src/services/taskParser.js << 'EOL'
/**
 * Task Parser Service (STUB)
 * 
 * This is a stub implementation to fix TypeScript errors.
 * Replace with actual implementation.
 */
import { debug, info, warn, error } from '../shared/logger.js';

/**
 * Parse a task
 * @param {string} taskInput - Task input to parse
 * @returns {Promise<object>} Parsed task
 */
export default async function parseTask(taskInput) {
  info('Task parser called (STUB)');
  
  // This is a stub implementation
  // Replace with actual task parsing logic
  
  return {
    id: 'stub-task-id',
    type: 'stub',
    content: taskInput,
    createdAt: new Date(),
  };
}
EOL

# Create src/services/performanceMonitor.js stub
cat > src/services/performanceMonitor.js << 'EOL'
/**
 * Performance Monitoring Service (STUB)
 * 
 * This is a stub implementation to fix TypeScript errors.
 * Replace with actual implementation.
 */
import { debug, info, warn, error } from '../shared/logger.js';

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring() {
  info('Performance monitoring started (STUB)');
  
  // This is a stub implementation
  // Replace with actual performance monitoring logic
}

/**
 * Get system metrics
 * @returns {Promise<object>} System metrics
 */
export async function getSystemMetrics() {
  // This is a stub implementation
  return {
    cpu: {
      usage: 0,
      cores: 4,
    },
    memory: {
      total: 8192,
      used: 2048,
      free: 6144,
    },
    uptime: process.uptime(),
  };
}

/**
 * Get metrics history
 * @returns {Promise<object[]>} Metrics history
 */
export async function getMetricsHistory() {
  // This is a stub implementation
  return [];
}
EOL

echo "Done creating stub implementations."
