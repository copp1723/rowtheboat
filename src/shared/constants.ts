/**
 * Application-wide constants
 */

// Queue names for BullMQ
export const QUEUE_NAMES = {
  // Email processing queues
  EMAIL: 'email',
  EMAIL_PROCESSING: 'email-processing',
  
  // Insight generation queues
  INSIGHT: 'insight',
  INSIGHT_PROCESSING: 'insight-processing',
  
  // Report processing queues
  REPORT: 'report',
  REPORT_PROCESSING: 'report-processing',
  
  // Workflow queues
  WORKFLOW: 'workflow',
  WORKFLOW_STEP: 'workflow-step',
  
  // Scheduled job queues
  SCHEDULED_JOB: 'scheduled-job',
  
  // Health check queues
  HEALTH_CHECK: 'health-check'
};

// Default timeouts
export const TIMEOUTS = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  LONG_TIMEOUT: 120000,   // 2 minutes
  SHORT_TIMEOUT: 5000     // 5 seconds
};

// Rate limiting
export const RATE_LIMITS = {
  EMAIL_SEND: {
    MAX_PER_MINUTE: 10,
    MAX_PER_HOUR: 100
  },
  API_CALLS: {
    MAX_PER_MINUTE: 60,
    MAX_PER_HOUR: 1000
  },
  OPENAI_CALLS: {
    MAX_PER_MINUTE: 20,
    MAX_PER_HOUR: 200
  }
};

// Health check intervals
export const HEALTH_CHECK_INTERVALS = {
  IMAP: 5 * 60 * 1000,    // 5 minutes
  DATABASE: 10 * 60 * 1000, // 10 minutes
  REDIS: 5 * 60 * 1000,   // 5 minutes
  API: 15 * 60 * 1000     // 15 minutes
};

// Circuit breaker settings
export const CIRCUIT_BREAKER = {
  DEFAULT_FAILURE_THRESHOLD: 5,
  DEFAULT_RECOVERY_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  DEFAULT_HALF_OPEN_REQUESTS: 1
};

// Retry settings
export const RETRY_SETTINGS = {
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BACKOFF_FACTOR: 2,
  DEFAULT_INITIAL_DELAY: 1000 // 1 second
};
