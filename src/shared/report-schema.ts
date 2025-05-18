/**
 * Database Schema for Multi-Vendor Report Ingestion
 * 
 * Defines the database tables for storing reports from multiple vendors,
 * tracking sources, and managing historical data for insights generation.
 */

import { pgTable, text, uuid, timestamp, jsonb, integer, boolean, index, foreignKey } from 'drizzle-orm/pg-core';

/**
 * Report Sources Table
 * Tracks where reports come from (email, manual upload, API, etc.)
 */
export const reportSources = pgTable('report_sources', {
  id: uuid('id').primaryKey().notNull(),
  vendor: text('vendor').notNull(),
  sourceType: text('source_type').notNull(), // 'email', 'upload', 'api', etc.
  emailSubject: text('email_subject'),
  emailFrom: text('email_from'),
  emailDate: timestamp('email_date'),
  filePath: text('file_path'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    vendorIdx: index('idx_report_sources_vendor').on(table.vendor),
    sourceTypeIdx: index('idx_report_sources_source_type').on(table.sourceType),
    createdAtIdx: index('idx_report_sources_created_at').on(table.createdAt),
  };
});

/**
 * Reports Table
 * Stores processed report data and metadata
 */
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().notNull(),
  sourceId: uuid('source_id').notNull().references(() => reportSources.id),
  reportData: jsonb('report_data').notNull(),
  recordCount: integer('record_count').notNull(),
  vendor: text('vendor').notNull(),
  reportDate: timestamp('report_date'),
  reportType: text('report_type'),
  status: text('status').notNull(), // 'pending_analysis', 'analyzed', 'error'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    sourceIdIdx: index('idx_reports_source_id').on(table.sourceId),
    vendorIdx: index('idx_reports_vendor').on(table.vendor),
    statusIdx: index('idx_reports_status').on(table.status),
    reportDateIdx: index('idx_reports_report_date').on(table.reportDate),
  };
});

/**
 * Insights Table
 * Stores generated insights from report analysis
 */
export const insights = pgTable('insights', {
  id: uuid('id').primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => reports.id),
  insightData: jsonb('insight_data').notNull(),
  promptVersion: text('prompt_version'),
  overallScore: integer('overall_score'),
  qualityScores: jsonb('quality_scores'),
  businessImpact: jsonb('business_impact'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    reportIdIdx: index('idx_insights_report_id').on(table.reportId),
    createdAtIdx: index('idx_insights_created_at').on(table.createdAt),
  };
});

/**
 * Insight Distributions Table
 * Tracks distribution of insights to recipients
 */
export const insightDistributions = pgTable('insight_distributions', {
  id: uuid('id').primaryKey().notNull(),
  insightId: uuid('insight_id').notNull().references(() => insights.id),
  recipientEmail: text('recipient_email').notNull(),
  recipientRole: text('recipient_role'),
  distributionDate: timestamp('distribution_date'),
  emailSent: boolean('email_sent').default(false),
  emailSentDate: timestamp('email_sent_date'),
  emailStatus: text('email_status'),
  emailLogId: uuid('email_log_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    insightIdIdx: index('idx_insight_distributions_insight_id').on(table.insightId),
    recipientEmailIdx: index('idx_insight_distributions_recipient_email').on(table.recipientEmail),
    emailSentIdx: index('idx_insight_distributions_email_sent').on(table.emailSent),
  };
});

/**
 * Historical Metrics Table
 * Stores time-series data for trend analysis and reporting
 */
export const historicalMetrics = pgTable('historical_metrics', {
  id: uuid('id').primaryKey().notNull(),
  vendor: text('vendor').notNull(),
  metricDate: timestamp('metric_date').notNull(),
  metricType: text('metric_type').notNull(), // e.g. 'lead_count', 'conversion_rate', etc.
  metricValue: jsonb('metric_value').notNull(),
  source: text('source').notNull(), // e.g. 'calculated', 'insight', 'report'
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    vendorIdx: index('idx_historical_metrics_vendor').on(table.vendor),
    metricDateIdx: index('idx_historical_metrics_metric_date').on(table.metricDate),
    metricTypeIdx: index('idx_historical_metrics_metric_type').on(table.metricType),
  };
});

/**
 * Report Processing Jobs Table
 * Tracks the status of report processing jobs for retries and monitoring
 */
export const reportProcessingJobs = pgTable('report_processing_jobs', {
  id: uuid('id').primaryKey().notNull(),
  reportId: uuid('report_id').notNull().references(() => reports.id),
  jobType: text('job_type').notNull(), // 'analysis', 'insight_generation', 'distribution'
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
  attempts: integer('attempts').default(0),
  lastError: text('last_error'),
  result: jsonb('result'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    reportIdIdx: index('idx_report_processing_jobs_report_id').on(table.reportId),
    jobTypeIdx: index('idx_report_processing_jobs_job_type').on(table.jobType),
    statusIdx: index('idx_report_processing_jobs_status').on(table.status),
  };
});