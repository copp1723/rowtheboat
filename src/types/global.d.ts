// Import declarations for JavaScript modules with relative paths
declare module '*/attachmentParsers.js' {
  interface ParserResult {
    content: string;
    metadata: Record<string, unknown>;
  }

  export function parseTextAttachment(content: string): Promise<ParserResult>;
  export function parsePdfAttachment(content: Buffer): Promise<ParserResult>;
  export function parseImageAttachment(content: Buffer): Promise<ParserResult>;
}

declare module '*/stepHandlers.js' {
  interface StepHandler {
    execute(input: unknown): Promise<unknown>;
  }

  export const stepHandlers: Record<string, (config: Record<string, any>, context: Record<string, any>) => Promise<unknown>>;
}

declare module '*/workflowEmailServiceFixed.js' {
  export function sendWorkflowCompletionEmail(
    workflowId: string,
    recipient: string,
    variables: Record<string, unknown>
  ): Promise<void>;

  export function configureNotification(
    workflowId: string,
    config: {
      recipientEmail: string;
      sendOnCompletion?: boolean;
      sendOnFailure?: boolean;
    }
  ): Promise<void>;

  export function getEmailLogs(workflowId: string): Promise<unknown[]>;
  export function retryEmail(emailId: string): Promise<void>;

  export function getNotificationSettings(workflowId: string): Promise<{
    recipientEmail: string;
    sendOnCompletion: boolean;
    sendOnFailure: boolean;
  }>;

  export function deleteNotification(workflowId: string): Promise<void>;
}

declare module '*/awsKmsService.js' {
  export function logSecurityEvent(eventType: string, userId?: string, metadata?: Record<string, unknown>): Promise<void>;

  export interface KmsOptions {
    region?: string;
    keyId?: string;
    enabled?: boolean;
    keyAlias?: string;
  }

  export function initializeKmsService(options?: KmsOptions): Promise<void>;
  export function createKey(description: string): Promise<string>;
  export function scheduleKeyDeletion(keyId: string, pendingWindowInDays: number): Promise<void>;
}

declare module 'cron' {
  export function scheduleJob(expression: string, callback: () => void): { cancel: () => void };
}

// Declare modules without type definitions
declare module 'pdf-parse' {
  interface PdfParseOptions {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  }

  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export = parse;
}

// Add BullMQ compatibility types
declare module 'bullmq' {
  import { Redis } from 'ioredis';

  export interface ConnectionOptions {
    host?: string;
    port?: number;
    password?: string;
    [key: string]: any;
  }

  export interface JobOptions {
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    lifo?: boolean;
    timeout?: number;
    jobId?: string;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    stackTraceLimit?: number;
    parent?: {
      id: string;
      queue: string;
    };
    sizeLimit?: number;
    [key: string]: any;
  }

  // Alias for JobOptions for compatibility
  export type JobsOptions = JobOptions;

  export class Queue<T = any> {
    constructor(name: string, options?: any);
    add(name: string, data: T, options?: JobOptions): Promise<Job<T>>;
    getJob(jobId: string): Promise<Job<T> | undefined>;
    getJobs(types: string[], start?: number, end?: number, asc?: boolean): Promise<Job<T>[]>;
    getJobCounts(): Promise<Record<string, number>>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    close(): Promise<void>;
  }

  export class Worker<T = any> {
    constructor(name: string, processor: (job: Job<T>) => Promise<any>, options?: any);
    on(event: string, callback: (...args: any[]) => void): this;
    close(): Promise<void>;
    run(): Promise<void>;
  }

  export class QueueScheduler {
    constructor(name: string, options?: any);
    close(): Promise<void>;
  }

  export class Job<T = any> {
    id: string;
    data: T;
    name: string;
    progress(progress: number | object): Promise<void>;
    updateData(data: T): Promise<void>;
    update(data: T): Promise<void>;
    remove(): Promise<void>;
    retry(): Promise<void>;
    discard(): Promise<void>;
    moveToCompleted(returnValue: any, token: string, fetchNext?: boolean): Promise<void>;
    moveToFailed(err: Error, token: string, fetchNext?: boolean): Promise<void>;
    isCompleted(): Promise<boolean>;
    isFailed(): Promise<boolean>;
    isActive(): Promise<boolean>;
    isWaiting(): Promise<boolean>;
    isDelayed(): Promise<boolean>;
    getState(): Promise<string>;
  }

  export class QueueEvents {
    constructor(name: string, options?: any);
    on(event: string, callback: (...args: any[]) => void): this;
    close(): Promise<void>;
  }
}

declare module 'bullmq.js' {
  export * from 'bullmq';
  export { default } from 'bullmq';
}

declare module 'ioredis.js' {
  import IORedis from 'ioredis';
  export default IORedis;
}

// Declare any missing modules
declare module '*/emailTemplateEngine.js' {
  export interface EmailTemplateOptions {
    templateName: string;
    subject: string;
    variables: Record<string, any>;
  }

  export interface EmailTemplateResult {
    html: string;
    text: string;
    subject: string;
  }

  export function renderEmailTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<string>;
}

// Node.js modules with .js extension
declare module 'node-cache.js' {
  import NodeCache from 'node-cache';
  export default NodeCache;
}

declare module 'node-cron.js' {
  import cron from 'node-cron';
  export default cron;
}

declare module '@sentry/node.js' {
  export * from '@sentry/node';
}

declare module 'url.js' {
  export * from 'url';
}

declare module 'exceljs.js' {
  import ExcelJS from 'exceljs';
  export default ExcelJS;
}

declare module 'csv-parse/sync.js' {
  export * from 'csv-parse/sync';
}

declare module '@sendgrid/mail.js' {
  import sgMail from '@sendgrid/mail';
  export default sgMail;
}

declare module 'express-rate-limit.js' {
  import rateLimit from 'express-rate-limit';
  export default rateLimit;
}

declare module '@eko-ai/eko.js' {
  export class Eko {
    constructor(options?: any);
    info(message: string, metadata?: any): void;
    error(message: string, metadata?: any): void;
    parseTask(userInput: string): Promise<any>;
  }
}

// Add missing module declarations for drizzle-orm
declare module 'drizzle-orm/postgres-js.js' {
  export * from 'drizzle-orm/postgres-js';
}

declare module 'drizzle-orm/postgres-js/driver.js' {
  export * from 'drizzle-orm/postgres-js/driver';
}

// Declare missing modules
declare module 'pdf-parse';
declare module 'bullmq';
declare module 'express-rate-limit';
// Add other missing modules as they are identified
