/**
 * Output Storage Module
 *
 * This module provides functionality to save output results to structured
 * directories for tracking and comparison.
 */
import fs from 'fs';
import path from 'path';
// Root directory for storing results
const resultsDir = path.join(process.cwd(), 'results');
/**
 * Ensure the results directory exists
 */
function ensureResultsDirectory(): void {
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
}
/**
 * Creates a structured path for storing results
 * @param platform - Platform name (e.g., 'VinSolutions')
 * @param dateStr - Optional date string (defaults to current date in YYYY-MM-DD format)
 * @param filename - Filename for the result
 * @returns Full path to store the result
 */
export function createResultPath(platform: string, filename: string, dateStr?: string): string {
  // Default to current date if not provided
  const date = dateStr || new Date().toISOString().split('T')[0];
  // Create platform directory
  const platformDir = path.join(resultsDir, platform);
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  // Create date directory
  const dateDir = path.join(platformDir, date);
  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, { recursive: true });
  }
  // Return full path
  return path.join(dateDir, filename);
}
/**
 * Save result to a structured directory
 * @param platform - Platform name (e.g., 'VinSolutions')
 * @param result - Result data to save
 * @param filename - Filename for the result (without extension)
 * @param metadata - Optional metadata to include
 * @returns Path to the saved file
 */
export function saveResult(
  platform: string,
  result: any,
  filename: string,
  metadata?: Record<string, any>
): string {
  ensureResultsDirectory();
  // Add .json extension if not present
  const filenameWithExt = filename.endsWith('.json') ? filename : `${filename}.json`;
  // Create full path
  const fullPath = createResultPath(platform, filenameWithExt);
  // Prepare data with metadata
  const dataToSave = {
    timestamp: new Date().toISOString(),
    metadata: metadata || {},
    result,
  };
  // Write to file
  fs.writeFileSync(fullPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  return fullPath;
}
/**
 * Load a previously saved result
 * @param filepath - Path to the result file
 * @returns Loaded result data
 */
export function loadResult(filepath: string): any {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Result file not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}
