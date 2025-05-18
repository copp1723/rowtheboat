/**
 * Email Template Engine
 *
 * A simple template engine for rendering email templates with variable substitution.
 * Supports both HTML and plain text templates.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Template directory path
const TEMPLATE_DIR = path.join(__dirname, 'emailTemplates');
// Cache for templates to avoid reading from disk on every render
const templateCache: Record<string, string> = {};
/**
 * Template data interface
 */
export interface TemplateData {
  [key: string]: any;
}
/**
 * Email template options
 */
export interface EmailTemplateOptions {
  templateName: string;
  data: TemplateData;
  format?: 'html' | 'text' | 'both';
}
/**
 * Email template result
 */
export interface EmailTemplateResult {
  html?: string;
  text?: string;
}
/**
 * Load a template from file or cache
 *
 * @param templateName - Name of the template
 * @param format - Format of the template (html or text)
 * @returns The template string
 */
function loadTemplate(templateName: string, format: 'html' | 'text'): string {
  const cacheKey = `${templateName}.${format}`;
  // Return from cache if available
  if (templateCache[cacheKey]) {
    return templateCache[cacheKey];
  }
  // Determine file extension based on format
  const extension = format === 'html' ? 'html' : 'txt';
  const filePath = path.join(TEMPLATE_DIR, `${templateName}.${extension}`);
  try {
    // Read template from file
    const template = fs.readFileSync(filePath, 'utf8');
    // Cache the template
    templateCache[cacheKey] = template;
    return template;
  } catch (error) {
    console.error(`Error loading template ${templateName}.${extension}:`, error);
    throw new Error(`Template ${templateName}.${extension} not found`);
  }
}
/**
 * Render a template with data
 *
 * @param template - Template string
 * @param data - Data to render in the template
 * @returns Rendered template
 */
function renderTemplate(template: string, data: TemplateData): string {
  // Replace variables in the format {{variableName}}
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    // Handle nested properties using dot notation (e.g., user.name)
    const keys = key.trim().split('.');
    let value = data;
    for (const k of keys) {
      if (value === undefined || value === null) {
        return '';
      }
      value = value[k];
    }
    // Handle arrays with special #each syntax
    if (match.startsWith('{{#each') && Array.isArray(value)) {
      // Extract the content between {{#each}} and {{/each}}
      const eachRegex = new RegExp(`\\{\\{#each\\s+${key}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`, 'g');
      let eachMatch;
      let result = template;
      while ((eachMatch = eachRegex.exec(template)) !== null) {
        const itemTemplate = eachMatch[1];
        const renderedItems = value
          .map((item: any) => {
            // Replace {{this}} with the current item
            return itemTemplate.replace(/\{\{this\}\}/g, item.toString());
          })
          .join('');
        // Replace the entire {{#each}} block with the rendered items
        result = result.replace(eachMatch[0], renderedItems);
      }
      return result;
    }
    // Handle conditional blocks with #if syntax
    if (match.startsWith('{{#if')) {
      // Extract the content between {{#if}} and {{/if}}
      const ifRegex = new RegExp(`\\{\\{#if\\s+${key}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
      let ifMatch;
      let result = template;
      while ((ifMatch = ifRegex.exec(template)) !== null) {
        // If the value is truthy, keep the content, otherwise remove it
        const renderedContent = value ? ifMatch[1] : '';
        // Replace the entire {{#if}} block with the rendered content
        result = result.replace(ifMatch[0], renderedContent);
      }
      return result;
    }
    // Return the value or an empty string if undefined
    return value !== undefined ? value.toString() : '';
  });
}
/**
 * Render an email template
 *
 * @param options - Template options
 * @returns Rendered template
 */
export function renderEmailTemplate(options: EmailTemplateOptions): EmailTemplateResult {
  const { templateName, data, format = 'both' } = options;
  const result: EmailTemplateResult = {};
  // Render HTML template if requested
  if (format === 'html' || format === 'both') {
    try {
      const htmlTemplate = loadTemplate(templateName, 'html');
      result.html = renderTemplate(htmlTemplate, data);
    } catch (error) {
      console.warn(`HTML template not found for ${templateName}, falling back to text`);
    }
  }
  // Render text template if requested
  if (format === 'text' || format === 'both' || (format === 'both' && !result.html)) {
    try {
      const textTemplate = loadTemplate(templateName, 'text');
      result.text = renderTemplate(textTemplate, data);
    } catch (error) {
      console.warn(`Text template not found for ${templateName}`);
      // If HTML is available but text is not, generate a simple text version
      if (result.html) {
        result.text = htmlToText(result.html);
      }
    }
  }
  return result;
}
/**
 * Convert HTML to plain text
 *
 * @param html - HTML string
 * @returns Plain text
 */
function htmlToText(html: string): string {
  // Simple HTML to text conversion
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
/**
 * Get a list of available templates
 *
 * @returns Array of template names
 */
export function listTemplates(): string[] {
  try {
    const files = fs.readdirSync(TEMPLATE_DIR);
    // Extract unique template names without extensions
    const templateNames = new Set<string>();
    for (const file of files) {
      const match = file.match(/^(.+)\.(html|txt)$/);
      if (match) {
        templateNames.add(match[1]);
      }
    }
    return Array.from(templateNames);
  } catch (error) {
    console.error('Error listing templates:', error);
    return [];
  }
}
/**
 * Clear the template cache
 */
export function clearTemplateCache(): void {
  Object.keys(templateCache).forEach((key) => {
    delete templateCache[key];
  });
}
