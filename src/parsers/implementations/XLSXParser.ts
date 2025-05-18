/**
 * XLSX Parser
 * 
 * Implementation of the parser interface for Excel files.
 * Uses streaming for memory-efficient parsing of large files.
 */

import { Readable } from 'stream';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

import { BaseParser } from '../base/BaseParser.js';
import { FileType, ParserOptions, ParserResult } from '../base/types.js';
import { ParseError } from '../errors/ParserError.js';
import logger from '../../utils/logger.js';
import { getErrorMessage } from '../../utils/errorUtils.js';
import { streamToTempFile, cleanupTempFiles } from '../utils/fileUtils.js';

/**
 * XLSX parser options
 */
export interface XLSXParserOptions extends ParserOptions {
  /** Sheet names to parse (default: all sheets) */
  sheetNames?: string[];
  
  /** Sheet indices to parse (default: all sheets) */
  sheetIndices?: number[];
  
  /** Whether to use the first row as column headers (default: true) */
  useHeaders?: boolean;
  
  /** Custom column names */
  columns?: string[];
  
  /** Header row index (default: 1) */
  headerRow?: number;
  
  /** Data start row index (default: headerRow + 1 if useHeaders is true, otherwise headerRow) */
  dataStartRow?: number;
  
  /** Whether to include empty cells (default: false) */
  includeEmptyCells?: boolean;
  
  /** Maximum number of rows to parse (default: unlimited) */
  maxRows?: number;
}

/**
 * XLSX parser implementation
 */
export class XLSXParser extends BaseParser {
  /**
   * Constructor
   */
  constructor() {
    super([FileType.XLSX, FileType.XLS]);
  }
  
  /**
   * Parse Excel content
   * 
   * @param content - Excel content as Buffer
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseContent(content: string | Buffer, options: XLSXParserOptions = {}): Promise<ParserResult> {
    try {
      // Ensure content is a Buffer
      const xlsxContent = Buffer.isBuffer(content) ? content : Buffer.from(content.toString(), 'binary');
      
      // Create a workbook from the buffer
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(xlsxContent);
      
      // Extract sheet names for metadata
      const allSheetNames = workbook.worksheets.map(sheet => sheet.name);
      
      // Determine which sheets to process
      let sheetsToProcess: ExcelJS.Worksheet[] = [];
      
      if (options.sheetNames && options.sheetNames.length > 0) {
        // Process specified sheets by name
        sheetsToProcess = options.sheetNames
          .map(name => workbook.getWorksheet(name))
          .filter((sheet): sheet is ExcelJS.Worksheet => sheet !== undefined);
      } else if (options.sheetIndices && options.sheetIndices.length > 0) {
        // Process specified sheets by index
        sheetsToProcess = options.sheetIndices
          .map(index => workbook.getWorksheet(index + 1))
          .filter((sheet): sheet is ExcelJS.Worksheet => sheet !== undefined);
      } else {
        // Process all sheets
        sheetsToProcess = workbook.worksheets;
      }
      
      if (sheetsToProcess.length === 0) {
        throw new ParseError('No valid worksheets found to process', {
          availableSheets: allSheetNames,
          requestedSheets: options.sheetNames || options.sheetIndices,
        });
      }
      
      // Process each sheet
      const allRecords: Record<string, any>[] = [];
      const sheetResults: Record<string, any> = {};
      
      for (const worksheet of sheetsToProcess) {
        const sheetRecords = this.processWorksheet(worksheet, options);
        allRecords.push(...sheetRecords);
        
        // Store sheet-specific results
        sheetResults[worksheet.name] = {
          recordCount: sheetRecords.length,
          columns: Object.keys(sheetRecords[0] || {}),
        };
      }
      
      // Validate with schema if provided
      const validatedRecords = this.validateWithSchema(allRecords, options.schema);
      
      // Log successful parsing
      logger.info({
        event: 'parsed_xlsx_records',
        file: options._fileName || 'unknown',
        recordCount: validatedRecords.length,
        sheetCount: sheetsToProcess.length,
        timestamp: new Date().toISOString(),
      }, 'Parsed XLSX records');
      
      // Create and return the result
      return this.createResult(validatedRecords, {
        ...options,
        _metadata: {
          sheetNames: sheetsToProcess.map(sheet => sheet.name),
          allSheetNames,
          sheetResults,
          headerRow: options.useHeaders !== false,
        },
      });
    } catch (error) {
      // Log error
      logger.error({
        event: 'xlsx_parser_error',
        file: options._fileName || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        parser: 'XLSXParser',
      });
      
      // Throw a ParseError
      throw new ParseError(`Failed to parse XLSX: ${getErrorMessage(error)}`, {
        originalError: error,
        fileName: options._fileName,
      });
    }
  }
  
  /**
   * Parse an Excel stream
   * 
   * @param stream - Stream to parse
   * @param options - Optional parsing options
   * @returns Promise resolving to the parsing result
   */
  public async parseStream(stream: Readable, options: XLSXParserOptions = {}): Promise<ParserResult> {
    let tempFilePath: string | null = null;
    
    try {
      // ExcelJS doesn't support direct streaming, so we need to save to a temp file
      tempFilePath = await streamToTempFile(stream, {
        prefix: 'xlsx-parser-',
        suffix: '.xlsx',
      });
      
      // Create a workbook reader for streaming
      const workbook = new ExcelJS.Workbook();
      const reader = workbook.xlsx.createInputStream();
      
      // Create a file stream to the temp file
      const fileStream = new Readable();
      fileStream._read = () => {}; // Required for custom Readable
      
      // Read the temp file in chunks
      const fileBuffer = await workbook.xlsx.readFile(tempFilePath);
      
      // Now process the workbook
      const result = await this.parseContent(fileBuffer, options);
      
      // Add streaming metadata
      result.metadata.streaming = true;
      
      return result;
    } catch (error) {
      throw new ParseError(`Failed to parse XLSX stream: ${getErrorMessage(error)}`, {
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
   * Process a worksheet
   * 
   * @param worksheet - Worksheet to process
   * @param options - Parser options
   * @returns Array of records
   */
  private processWorksheet(worksheet: ExcelJS.Worksheet, options: XLSXParserOptions): Record<string, any>[] {
    // Determine if we should use headers
    const useHeaders = options.useHeaders !== false;
    
    // Determine header row
    const headerRow = options.headerRow || 1;
    
    // Extract headers
    let headers: string[] = [];
    
    if (useHeaders) {
      // If custom columns are provided, use those
      if (options.columns && options.columns.length > 0) {
        headers = options.columns;
      } else {
        // Extract headers from the header row
        const headerRowData = worksheet.getRow(headerRow);
        headers = [];
        
        headerRowData.eachCell({ includeEmpty: options.includeEmptyCells }, (cell, colNumber) => {
          headers[colNumber - 1] = cell.value ? String(cell.value).trim() : `Column${colNumber}`;
        });
      }
    }
    
    // Parse data rows
    const records: Record<string, any>[] = [];
    const startRow = useHeaders ? headerRow + 1 : headerRow;
    
    // Iterate through rows
    worksheet.eachRow({ includeEmpty: options.includeEmptyCells }, (row, rowNumber) => {
      // Skip header row if using headers
      if (useHeaders && rowNumber < startRow) {
        return;
      }
      
      // Skip rows before data start row
      if (options.dataStartRow && rowNumber < options.dataStartRow) {
        return;
      }
      
      // Check if we've reached the maximum number of rows
      if (options.maxRows && records.length >= options.maxRows) {
        return;
      }
      
      // Create record
      const record: Record<string, any> = {};
      
      // Process cells
      row.eachCell({ includeEmpty: options.includeEmptyCells }, (cell, colNumber) => {
        const columnName = useHeaders ? headers[colNumber - 1] || `Column${colNumber}` : `Column${colNumber}`;
        record[columnName] = this.getCellValue(cell);
      });
      
      // Add record
      records.push(record);
    });
    
    return records;
  }
  
  /**
   * Get the value of a cell
   * 
   * @param cell - Cell to get value from
   * @returns Cell value
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.value === null || cell.value === undefined) {
      return null;
    }
    
    // Handle different value types
    switch (cell.type) {
      case ExcelJS.ValueType.Number:
        return cell.value;
      case ExcelJS.ValueType.String:
        return String(cell.value).trim();
      case ExcelJS.ValueType.Date:
        return cell.value;
      case ExcelJS.ValueType.Hyperlink:
        return (cell.value as { text: string }).text || null;
      case ExcelJS.ValueType.Formula:
        // Return the result of the formula
        return cell.result;
      case ExcelJS.ValueType.Boolean:
        return cell.value;
      case ExcelJS.ValueType.Error:
        return null;
      default:
        return cell.value;
    }
  }
}
