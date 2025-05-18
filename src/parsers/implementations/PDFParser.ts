/**
 * PDF Parser
 * 
 * Implementation of the parser interface for PDF files.
 */

import { Readable } from 'stream';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';

import { BaseParser } from '../base/BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../base/types.js';
import { ParseError } from '../errors/ParserError.js';
import logger from '../../utils/logger.js';
import { getErrorMessage } from '../../utils/errorUtils.js';
import { streamToTempFile, cleanupTempFiles } from '../utils/fileUtils.js';

/**
 * PDF extraction mode
 */
export enum PDFExtractionMode {
  LATTICE = 'lattice', // For PDFs with bordered tables (grid lines)
  STREAM = 'stream',   // For PDFs with tables separated by whitespace
  AUTO = 'auto',       // Try both methods and select the best result
  TEXT_ONLY = 'text',  // Extract text only, no table detection
}

/**
 * PDF parser options
 */
export interface PDFParserOptions extends ParserOptions {
  /** PDF extraction mode */
  extractionMode?: PDFExtractionMode;
  
  /** Page numbers to extract (default: all pages) */
  pages?: number[];
  
  /** Whether to extract tables (default: true) */
  extractTables?: boolean;
  
  /** Whether to extract text (default: true) */
  extractText?: boolean;
  
  /** Whether to extract images (default: false) */
  extractImages?: boolean;
  
  /** Whether to extract form fields (default: false) */
  extractForms?: boolean;
  
  /** Custom table extraction options */
  tableOptions?: {
    /** Vertical line detection threshold */
    verticalThreshold?: number;
    
    /** Horizontal line detection threshold */
    horizontalThreshold?: number;
    
    /** Minimum table area ratio */
    minTableAreaRatio?: number;
  };
}

/**
 * PDF parser implementation
 */
export class PDFParser extends BaseParser {
  /**
   * Constructor
   */
  constructor() {
    super([FileType.PDF]);
  }
  
  /**
   * Parse PDF content
   * 
   * @param content - PDF content as Buffer
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: PDFParserOptions = {}): Promise<ParserResult> {
    try {
      // Ensure content is a Buffer
      const pdfContent = Buffer.isBuffer(content) ? content : Buffer.from(content.toString(), 'binary');
      
      // Parse the PDF
      const pdfData = await pdfParse(pdfContent);
      
      // Extract text content
      const text = pdfData.text;
      
      logger.info({
        event: 'extracted_pdf_text',
        file: options._fileName || 'unknown',
        charCount: text.length,
        timestamp: new Date().toISOString(),
      }, 'Extracted PDF text');
      
      // Process the text into records
      const records = this.processText(text, options);
      
      // Validate with schema if provided
      const validatedRecords = this.validateWithSchema(records, options.schema);
      
      // Create and return the result
      return this.createResult(validatedRecords, {
        ...options,
        _metadata: {
          pageCount: pdfData.numpages,
          author: pdfData.info?.Author,
          title: pdfData.info?.Title,
          creationDate: pdfData.info?.CreationDate,
          extractionMode: options.extractionMode || PDFExtractionMode.TEXT_ONLY,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'pdf_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'PDFParser',
      });
      
      // Throw a ParseError
      throw new ParseError(`Failed to parse PDF: ${getErrorMessage(error)}`, {
        originalError: error,
        fileName: options._fileName,
      });
    }
  }
  
  /**
   * Parse a PDF stream
   * 
   * @param stream - Stream to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseStream(stream: Readable, options: PDFParserOptions = {}): Promise<ParserResult> {
    let tempFilePath: string | null = null;
    
    try {
      // pdf-parse doesn't support direct streaming, so we need to save to a temp file
      tempFilePath = await streamToTempFile(stream, {
        prefix: 'pdf-parser-',
        suffix: '.pdf',
      });
      
      // Read the temp file
      const fileBuffer = await pdfParse(tempFilePath);
      
      // Now process the PDF
      const result = await this.parseContent(fileBuffer, options);
      
      // Add streaming metadata
      result.metadata.streaming = true;
      
      return result;
    } catch (error) {
      throw new ParseError(`Failed to parse PDF stream: ${getErrorMessage(error)}`, {
        originalError: error,
        fileName: options._fileName,
      });
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        await cleanupTempFiles([tempFilePath]);
      }
    }
  }
  
  /**
   * Process text into records
   * 
   * @param text - Text to process
   * @param options - Parser options
   * @returns Array of records
   */
  private processText(text: string, options: PDFParserOptions): Record<string, any>[] {
    // This is a basic implementation that creates a single record with the text
    // In a real implementation, you would use more sophisticated techniques to extract structured data
    
    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // For simple text extraction, just return a single record with the full text
    if (options.extractionMode === PDFExtractionMode.TEXT_ONLY) {
      return [{
        text,
        lineCount: lines.length,
      }];
    }
    
    // For table extraction, we would need to implement more sophisticated logic
    // This is a placeholder for future implementation
    
    // For now, we'll just split the text into chunks and create a record for each chunk
    const records: Record<string, any>[] = [];
    const chunkSize = 20; // Number of lines per chunk
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('\n');
      
      records.push({
        chunkIndex: Math.floor(i / chunkSize),
        text: chunk,
        lineCount: Math.min(chunkSize, lines.length - i),
      });
    }
    
    return records;
  }
}
