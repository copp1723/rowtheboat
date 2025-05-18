/**
 * Prompt Template System
 * 
 * This module provides a structured way to manage and use prompt templates.
 * It supports versioning, caching, and hot-reloading of templates.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
import YAML from 'yaml';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the prompts directory
const PROMPTS_DIR = process.env.PROMPTS_DIR || path.join(__dirname, '../../prompts/templates');

// Cache for loaded prompts
const promptCache = new Map<string, PromptTemplate>();

// Last modified times for prompt files
const promptModifiedTimes = new Map<string, number>();

/**
 * Prompt template metadata
 */
export interface PromptMetadata {
  version: string;
  lastUpdated?: string;
  author?: string;
  description?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  tags?: string[];
}

/**
 * Prompt template structure
 */
export interface PromptTemplate extends PromptMetadata {
  name: string;
  systemPrompt: string;
  userPromptTemplate?: string;
  examples?: Array<{
    input: Record<string, any>;
    output: string | Record<string, any>;
  }>;
}

/**
 * Initialize the prompt template system
 * Creates the prompts directory if it doesn't exist
 */
export async function initializePromptSystem(): Promise<void> {
  try {
    // Ensure the prompts directory exists
    if (!fs.existsSync(PROMPTS_DIR)) {
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
      logger.info(`Created prompts directory: ${PROMPTS_DIR}`);
    }

    // Load all prompts into cache
    await loadAllPrompts();
    logger.info(`Initialized prompt system with ${promptCache.size} templates`);
  } catch (error) {
    logger.error('Failed to initialize prompt system:', error);
    throw error;
  }
}

/**
 * Load all prompts from the prompts directory
 */
export async function loadAllPrompts(): Promise<PromptTemplate[]> {
  try {
    const templates: PromptTemplate[] = [];
    
    // Read all files in the prompts directory recursively
    const files = await findPromptFiles(PROMPTS_DIR);
    
    // Load each prompt file
    for (const file of files) {
      try {
        const template = await loadPromptFile(file);
        templates.push(template);
      } catch (error) {
        logger.error(`Error loading prompt file ${file}:`, error);
      }
    }
    
    return templates;
  } catch (error) {
    logger.error('Error loading prompts:', error);
    return [];
  }
}

/**
 * Find all prompt files in a directory recursively
 * @param dir - Directory to search
 * @returns Array of file paths
 */
async function findPromptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  // Read all entries in the directory
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      const subFiles = await findPromptFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      // Add JSON and YAML files
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Load a prompt template from a file
 * @param filePath - Path to the prompt file
 * @returns The loaded prompt template
 */
async function loadPromptFile(filePath: string): Promise<PromptTemplate> {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse the file based on extension
  let data: any;
  if (filePath.endsWith('.json')) {
    data = JSON.parse(content);
  } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    data = YAML.parse(content);
  } else {
    throw new Error(`Unsupported file format: ${filePath}`);
  }
  
  // Get the file stats for last modified time
  const stats = fs.statSync(filePath);
  
  // Extract the prompt name from the file path
  const name = path.basename(filePath, path.extname(filePath));
  
  // Create the prompt template
  const template: PromptTemplate = {
    name,
    version: data.version || 'v1.0.0',
    lastUpdated: data.lastUpdated || stats.mtime.toISOString(),
    author: data.author,
    description: data.description,
    model: data.model,
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    responseFormat: data.responseFormat,
    tags: data.tags,
    systemPrompt: data.systemPrompt || data.system,
    userPromptTemplate: data.userPromptTemplate || data.userTemplate,
    examples: data.examples,
  };
  
  // Validate the template
  if (!template.systemPrompt) {
    throw new Error(`Invalid prompt template: missing systemPrompt in ${filePath}`);
  }
  
  // Store the template in the cache
  promptCache.set(name, template);
  
  // Store the last modified time
  promptModifiedTimes.set(filePath, stats.mtimeMs);
  
  return template;
}

/**
 * Get a prompt template by name
 * @param name - Name of the prompt template
 * @returns The prompt template or null if not found
 */
export async function getPromptTemplate(name: string): Promise<PromptTemplate | null> {
  // Check if the template is in the cache
  if (promptCache.has(name)) {
    return promptCache.get(name) || null;
  }
  
  // Try to load the template from file
  try {
    const filePath = path.join(PROMPTS_DIR, `${name}.json`);
    if (fs.existsSync(filePath)) {
      return await loadPromptFile(filePath);
    }
    
    const yamlPath = path.join(PROMPTS_DIR, `${name}.yaml`);
    if (fs.existsSync(yamlPath)) {
      return await loadPromptFile(yamlPath);
    }
    
    const ymlPath = path.join(PROMPTS_DIR, `${name}.yml`);
    if (fs.existsSync(ymlPath)) {
      return await loadPromptFile(ymlPath);
    }
  } catch (error) {
    logger.error(`Error loading prompt template ${name}:`, error);
  }
  
  return null;
}

/**
 * Fill a prompt template with variables
 * @param template - The prompt template
 * @param variables - Variables to fill in the template
 * @returns The filled prompt
 */
export function fillPromptTemplate(
  template: PromptTemplate,
  variables: Record<string, any>
): { systemPrompt: string; userPrompt: string | undefined } {
  // Fill the system prompt
  let systemPrompt = template.systemPrompt;
  
  // Fill the user prompt if it exists
  let userPrompt: string | undefined;
  if (template.userPromptTemplate) {
    userPrompt = template.userPromptTemplate;
    
    // Replace variables in the user prompt
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      userPrompt = userPrompt.replace(
        new RegExp(placeholder, 'g'),
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    }
  }
  
  return { systemPrompt, userPrompt };
}

/**
 * Save a prompt template to a file
 * @param template - The prompt template to save
 * @returns true if the save was successful
 */
export async function savePromptTemplate(template: PromptTemplate): Promise<boolean> {
  try {
    // Ensure the prompts directory exists
    if (!fs.existsSync(PROMPTS_DIR)) {
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
    }
    
    // Update the last updated timestamp
    template.lastUpdated = new Date().toISOString();
    
    // Save as JSON
    const filePath = path.join(PROMPTS_DIR, `${template.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
    
    // Update the cache
    promptCache.set(template.name, template);
    
    // Update the last modified time
    const stats = fs.statSync(filePath);
    promptModifiedTimes.set(filePath, stats.mtimeMs);
    
    return true;
  } catch (error) {
    logger.error(`Error saving prompt template ${template.name}:`, error);
    return false;
  }
}

/**
 * Check if prompt files have been modified and reload them
 */
export async function checkForPromptUpdates(): Promise<void> {
  try {
    // Find all prompt files
    const files = await findPromptFiles(PROMPTS_DIR);
    
    // Check each file for modifications
    for (const file of files) {
      const stats = fs.statSync(file);
      const lastModified = promptModifiedTimes.get(file);
      
      // If the file is new or has been modified, reload it
      if (!lastModified || stats.mtimeMs > lastModified) {
        try {
          await loadPromptFile(file);
          logger.info(`Reloaded prompt template: ${file}`);
        } catch (error) {
          logger.error(`Error reloading prompt template ${file}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking for prompt updates:', error);
  }
}
