// Common metadata interfaces with strict optional types
export interface ReportMetadata {
  vendor?: string | undefined;
  reportType?: string | undefined;
  timestamp?: string | undefined;
  format?: string | undefined;
  version?: string | undefined;
  parameters?: Record<string, unknown> | undefined;
}
export interface ParserMetadata {
  fileType?: string | undefined;
  fileName?: string | undefined;
  parseDate?: string | undefined;
  vendor?: string | undefined;
  reportType?: string | undefined;
  sheetNames?: string[] | undefined;
  pageCount?: number | undefined;
}
export interface ScheduleMetadata {
  intent?: string | undefined;
  platform?: string | undefined;
  parameters?: Record<string, unknown> | undefined;
  lastError?: string | undefined;
}
