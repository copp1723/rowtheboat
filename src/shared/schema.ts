import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uuid,
  boolean,
  serial,
  integer,
  bigint,
  uniqueIndex,
  decimal, // Add decimal import
} from 'drizzle-orm/pg-core';
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
);
// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email').unique(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
// Credential storage with encryption
export const credentials = pgTable(
  'credentials',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id),
    platform: varchar('platform', { length: 50 }).notNull(),
    label: varchar('label', { length: 100 }),
    encryptedData: text('encrypted_data').notNull(),
    iv: text('iv').notNull(), // Initialization vector for AES
    refreshToken: text('refresh_token'),
    refreshTokenExpiry: timestamp('refresh_token_expiry'),
    active: boolean('active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [index('idx_credentials_user_platform').on(table.userId!, table.platform!)]
);
// Execution plans for multi-step tasks
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  task: text('task').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
// Task logs for tracking tasks and their execution
export const taskLogs = pgTable('task_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id'),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  taskText: text('task_text').notNull(),
  taskData: jsonb('task_data'),
  status: varchar('status', { length: 20 }).default('pending'),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
// Job Queue for task retry and recovery
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => taskLogs.id),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(2).notNull(),
    lastError: text('last_error'),
    nextRunAt: timestamp('next_run_at').defaultNow().notNull(),
    lastRunAt: timestamp('last_run_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_jobs_status').on(table.status),
    index('idx_jobs_next_run_at').on(table.nextRunAt),
  ]
);
// Workflows for persistent multi-step task execution with memory
export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').references(() => users.id),
    steps: jsonb('steps').notNull(), // JSON array of step definitions
    currentStep: integer('current_step').default(0).notNull(),
    context: jsonb('context').default({}).notNull(), // Accumulated context/memory
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    lastError: text('last_error'),
    lastUpdated: timestamp('last_updated'),
    locked: boolean('locked').default(false), // Concurrency guard
    lockedAt: timestamp('locked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_workflows_status').on(table.status),
    index('idx_workflows_user').on(table.userId!),
  ]
);
// Enhanced scheduler for automated workflow execution with recovery
export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').references(() => users.id),
    workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }),
    intent: varchar('intent', { length: 100 }), // e.g. "inventory_aging"
    platform: varchar('platform', { length: 50 }), // CRM platform
    cron: text('cron').notNull(), // Cron expression for schedule
    nextRunAt: timestamp('next_run_at'), // When this schedule should run next
    lastRunAt: timestamp('last_run_at'), // When this schedule last ran
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, paused, failed
    retryCount: integer('retry_count').default(0).notNull(), // Count of failed attempts since last success
    enabled: boolean('enabled').default(true).notNull(), // Legacy field, keep for backward compatibility
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_schedules_workflow_id').on(table.workflowId!),
    index('idx_schedules_enabled').on(table.enabled),
    index('idx_schedules_status').on(table.status),
    index('idx_schedules_next_run').on(table.nextRunAt),
    index('idx_schedules_user_id').on(table.userId!),
  ]
);
// Email logs for tracking email sending
export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
    recipientEmail: text('recipient_email').notNull(),
    subject: text('subject').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, sent, failed
    attempts: integer('attempts').default(1).notNull(),
    sentAt: timestamp('sent_at'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_email_logs_workflow_id').on(table.workflowId!),
    index('idx_email_logs_status').on(table.status),
  ]
);
// Email notification configuration for workflows
export const emailNotifications = pgTable(
  'email_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
      .references(() => workflows.id, { onDelete: 'cascade' })
      .unique(),
    recipientEmail: text('recipient_email').notNull(),
    sendOnCompletion: boolean('send_on_completion').default(true).notNull(),
    sendOnFailure: boolean('send_on_failure').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_email_notifications_workflow_id').on(table.workflowId!)]
);
// Emails table for storing email content
export const emails = pgTable(
  'emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
    recipientEmail: text('recipient_email').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    htmlBody: text('html_body'),
    attachments: jsonb('attachments'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_emails_workflow_id').on(table.workflowId!)]
);
// Email queue for processing emails asynchronously
export const emailQueue = pgTable(
  'email_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientEmail: text('recipient_email').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    htmlBody: text('html_body'),
    options: jsonb('options').default({}),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, sent, failed
    attempts: integer('attempts').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    lastError: text('last_error'),
    processAfter: timestamp('process_after'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_email_queue_status').on(table.status),
    index('idx_email_queue_process_after').on(table.processAfter),
  ]
);
// Health check tables for API and service monitoring
export const healthChecks = pgTable(
  'health_checks',
  {
    id: varchar('id', { length: 50 }).primaryKey(), // Use a stable identifier like 'database', 'email', etc.
    name: varchar('name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'ok', 'warning', 'error'
    responseTime: integer('response_time').notNull(), // in milliseconds
    lastChecked: timestamp('last_checked').notNull(),
    message: text('message'),
    details: text('details'), // JSON stringified details
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_health_checks_status').on(table.status),
    index('idx_health_checks_last_checked').on(table.lastChecked),
  ]
);
// Health check logs for historical tracking
export const healthLogs = pgTable(
  'health_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    checkId: varchar('check_id', { length: 50 })
      .notNull()
      .references(() => healthChecks.id),
    timestamp: timestamp('timestamp').notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'ok', 'warning', 'error'
    responseTime: integer('response_time').notNull(), // in milliseconds
    message: text('message'),
    details: text('details'), // JSON stringified details
  },
  (table) => [
    index('idx_health_logs_check_id').on(table.checkId),
    index('idx_health_logs_timestamp').on(table.timestamp),
  ]
);
// Dealer credentials for CRM access
export const dealerCredentials = pgTable(
  'dealer_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').references(() => users.id),
    dealerId: varchar('dealer_id', { length: 50 }).notNull(),
    platform: varchar('platform', { length: 50 }).notNull(), // e.g., "vinsolutions", "vauto", "dealertrack"
    username: text('username').notNull(),
    encryptedPassword: text('encrypted_password').notNull(),
    iv: text('iv').notNull(), // Initialization vector for encryption
    active: boolean('active').default(true).notNull(),
    lastUsed: timestamp('last_used'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_dealer_credentials_user_id').on(table.userId!),
    index('idx_dealer_credentials_platform').on(table.platform!),
    index('idx_dealer_credentials_dealer_id').on(table.dealerId!),
  ]
);
// API keys for external services
export const apiKeys = pgTable(
  'api_keys',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    keyName: varchar('key_name', { length: 100 }).notNull().unique(),
    keyValue: text('key_value').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_api_keys_key_name').on(table.keyName)]
);
// Security audit logs for tracking security-related events
export const securityAuditLogs = pgTable(
  'security_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id').references(() => users.id),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'credential_create', 'credential_update', 'credential_delete', 'login_attempt', 'decryption_failure', etc.
    eventData: jsonb('event_data').default({}), // Additional event data (sanitized of sensitive information)
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6 address
    userAgent: text('user_agent'),
    severity: varchar('severity', { length: 20 }).notNull().default('info'), // 'info', 'warning', 'error', 'critical'
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    index('idx_security_audit_logs_user_id').on(table.userId!),
    index('idx_security_audit_logs_event_type').on(table.eventType),
    index('idx_security_audit_logs_timestamp').on(table.timestamp),
    index('idx_security_audit_logs_severity').on(table.severity),
  ]
);
// User-specific credentials with enhanced encryption
export const userCredentials = pgTable(
  'user_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id')
      .notNull()
      .references(() => users.id),
    serviceName: varchar('service_name', { length: 100 }).notNull(), // Name of the service (e.g., 'vinsolutions', 'vauto', 'openai')
    credentialName: varchar('credential_name', { length: 100 }).notNull(), // User-friendly name for the credential
    encryptedPayload: text('encrypted_payload').notNull(), // AES-GCM encrypted credential data
    iv: text('iv').notNull(), // Initialization vector
    authTag: text('auth_tag').notNull(), // Authentication tag for GCM mode
    metadata: jsonb('metadata').default({}), // Non-sensitive metadata about the credential
    expiresAt: timestamp('expires_at'), // Optional expiration date
    lastUsed: timestamp('last_used'), // When the credential was last used
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    idx_user_credentials_unique: uniqueIndex('idx_user_credentials_unique').on(
      table.userId!,
      table.serviceName,
      table.credentialName
    ),
  })
);
// Circuit breaker state tracking
export const circuitBreakerState = pgTable('circuit_breaker_state', {
  name: varchar('name', { length: 255 }).primaryKey(),
  state: varchar('state', { length: 20 }).notNull(), // 'closed', 'open', 'half-open'
  failures: integer('failures').default(0).notNull(),
  successes: integer('successes').default(0).notNull(),
  last_failure_ms: bigint('last_failure_ms', { mode: 'number' }).default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UpsertCredential = typeof credentials.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type UpsertPlan = typeof plans.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type UpsertWorkflow = typeof workflows.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type UpsertSchedule = typeof schedules.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type UpsertEmailLog = typeof emailLogs.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type UpsertEmailNotification = typeof emailNotifications.$inferInsert;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type UpsertHealthCheck = typeof healthChecks.$inferInsert;
export type HealthCheck = typeof healthChecks.$inferSelect;
export type UpsertHealthLog = typeof healthLogs.$inferInsert;
export type HealthLog = typeof healthLogs.$inferSelect;
export type UpsertEmail = typeof emails.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type UpsertEmailQueue = typeof emailQueue.$inferInsert;
export type EmailQueue = typeof emailQueue.$inferSelect;
export type UpsertDealerCredential = typeof dealerCredentials.$inferInsert;
export type DealerCredential = typeof dealerCredentials.$inferSelect;
export type UpsertApiKey = typeof apiKeys.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type UpsertSecurityAuditLog = typeof securityAuditLogs.$inferInsert;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;
export type UpsertUserCredential = typeof userCredentials.$inferInsert;
export type UserCredential = typeof userCredentials.$inferSelect;
// IMAP filters for email ingestion
export const imapFilters = pgTable(
  'imap_filters',
  {
    id: serial('id').primaryKey(),
    vendor: varchar('vendor', { length: 100 }).notNull(),
    fromAddress: varchar('from_address', { length: 255 }).notNull(),
    subjectRegex: text('subject_regex').notNull(),
    daysBack: integer('days_back').default(7).notNull(),
    filePattern: text('file_pattern'),
    active: boolean('active').default(true).notNull(),
    lastUsed: timestamp('last_used'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_imap_filters_vendor').on(table.vendor),
    index('idx_imap_filters_active').on(table.active),
    uniqueIndex('idx_imap_filters_vendor_from').on(table.vendor, table.fromAddress),
  ]
);
export type UpsertImapFilter = typeof imapFilters.$inferInsert;
export type ImapFilter = typeof imapFilters.$inferSelect;
// Failed emails table for error recovery
export const failedEmails = pgTable(
  'failed_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vendor: varchar('vendor', { length: 100 }).notNull(),
    messageId: varchar('message_id', { length: 255 }),
    subject: text('subject'),
    fromAddress: varchar('from_address', { length: 255 }),
    receivedDate: timestamp('received_date'),
    errorMessage: text('error_message').notNull(),
    errorStack: text('error_stack'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    nextRetryAt: timestamp('next_retry_at'),
    status: varchar('status', { length: 20 }).default('failed').notNull(), // failed, retry_scheduled, retry_failed, archived
    rawContent: text('raw_content'), // Original email content for debugging
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_failed_emails_vendor').on(table.vendor),
    index('idx_failed_emails_status').on(table.status),
    index('idx_failed_emails_next_retry').on(table.nextRetryAt),
  ]
);
export type UpsertFailedEmail = typeof failedEmails.$inferInsert;
export type FailedEmail = typeof failedEmails.$inferSelect;
// Workflow step interfaces
export type WorkflowStepType =
  | 'emailIngestion'
  | 'insightGeneration'
  | 'crm'
  | 'dataProcessing'
  | 'api'
  | 'custom';
export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  config: Record<string, any>;
  retries?: number;
  maxRetries?: number;
  backoffFactor?: number;
}
export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'failed' | 'completed';
// Insight logs for tracking AI insight generation
export const insightLogs = pgTable(
  'insight_logs',
  {
    id: serial('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    success: boolean('success').notNull(),
    durationMs: integer('duration_ms'),
    error: text('error'),
    role: varchar('role', { length: 50 }),
    promptVersion: varchar('prompt_version', { length: 20 }),
    rawResponse: jsonb('raw_response'),
    rawPrompt: text('raw_prompt'),
    apiKeyHint: varchar('api_key_hint', { length: 10 }), // Store last 4 chars of API key for debugging
    // Enhanced fields for comprehensive LLM audit logging
    userId: varchar('user_id').references(() => users.id),
    model: varchar('model', { length: 50 }),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    cost: decimal('cost', { precision: 10, scale: 6 }), // Add decimal type
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('idx_insight_logs_created_at').on(table.createdAt),
    index('idx_insight_logs_success').on(table.success),
    index('idx_insight_logs_user_id').on(table.userId!),
    index('idx_insight_logs_model').on(table.model!),
    index('idx_insight_logs_created_at_user_id').on(table.createdAt, table.userId!),
  ]
);
export type UpsertInsightLog = typeof insightLogs.$inferInsert;
export type InsightLog = typeof insightLogs.$inferSelect;
// Unencrypted credential data typings
export interface CredentialData {
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  tokenType?: string;
  accessToken?: string;
  dealerId?: string;
  [key: string]: string | undefined;
}
