declare module 'attachmentParsers' {
  /**
   * Supported file types for parsing
   */
  export enum FileType {
    CSV = 'csv',
    XLSX = 'xlsx',
    XLS = 'xls',
    PDF = 'pdf',
    UNKNOWN = 'unknown',
  }

  /**
   * Result of parsing an attachment
   */
  export interface ParserResult {
    /**
     * Unique identifier for the parsing result
     */
    id: string;
    
    /**
     * Array of records parsed from the attachment
     */
    records: Record<string, any>[];
    
    /**
     * Number of records parsed
     */
    recordCount: number;
    
    /**
     * Metadata about the parsing operation
     */
    metadata: {
      /**
       * Type of file that was parsed
       */
      fileType: FileType;
      
      /**
       * Name of the file that was parsed
       */
      fileName: string;
      
      /**
       * Timestamp when the file was parsed
       */
      parseDate: string;
      
      /**
       * Vendor name for the data source
       */
      vendor?: string;
      
      /**
       * Report type identifier
       */
      reportType?: string;
      
      /**
       * Additional metadata specific to parser implementations
       */
      [key: string]: any;
    };
  }

  /**
   * Options for parsing attachments
   */
  export interface ParserOptions {
    /**
     * Optional schema for validation
     */
    schema?: any;
    
    /**
     * Vendor name for the data source
     */
    vendor?: string;
    
    /**
     * Report type identifier
     */
    reportType?: string;
    
    /**
     * Names of sheets to parse (for Excel files)
     */
    sheetNames?: string[];
    
    /**
     * Additional options specific to parser implementations
     */
    [key: string]: any;
  }

  /**
   * Parse a CSV file
   * 
   * @param filePath - Path to the CSV file
   * @param options - Parsing options
   * @returns Parsed data with metadata
   */
  export function parseCSV(filePath: string, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Parse an Excel file (XLSX/XLS)
   * 
   * @param filePath - Path to the Excel file
   * @param options - Parsing options
   * @returns Parsed data with metadata
   */
  export function parseXLSX(filePath: string, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Parse a PDF file
   * 
   * @param filePath - Path to the PDF file
   * @param options - Parsing options
   * @returns Parsed data with metadata
   */
  export function parsePDF(filePath: string, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Parse a file based on its extension
   * 
   * @param filePath - Path to the file
   * @param options - Parsing options
   * @returns Parsed data with metadata
   */
  export function parseByExtension(filePath: string, options?: ParserOptions): Promise<ParserResult>;

  /**
   * Detect the type of a file based on its extension
   * 
   * @param filePath - Path to the file
   * @returns The detected file type
   */
  export function detectFileType(filePath: string): FileType;
}
