/**
 * Attachment Schema
 * 
 * Database schema definitions for attachments and related tables.
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Attachment Hashes Table
 * Stores hashes of processed attachments for deduplication
 */
export const attachmentHashes = pgTable('attachment_hashes', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: varchar('hash', { length: 64 }).notNull().unique(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => {
  return {
    hashIdx: index('idx_attachment_hashes_hash').on(table.hash),
    expiresAtIdx: index('idx_attachment_hashes_expires_at').on(table.expiresAt),
  };
});

/**
 * Attachments Table
 * Stores information about attachments
 */
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path'),
  fileSize: text('file_size'),
  fileType: text('file_type').notNull(),
  mimeType: text('mime_type'),
  hash: varchar('hash', { length: 64 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    fileNameIdx: index('idx_attachments_file_name').on(table.fileName),
    fileTypeIdx: index('idx_attachments_file_type').on(table.fileType),
    hashIdx: index('idx_attachments_hash').on(table.hash),
    createdAtIdx: index('idx_attachments_created_at').on(table.createdAt),
  };
});
