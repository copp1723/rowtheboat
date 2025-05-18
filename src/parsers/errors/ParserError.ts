/**
 * Parser Error Classes
 *
 * Custom error classes for the parser system.
 * These provide structured error information with context.
 */

/**
 * Base error class for all parser errors
 */
export class ParserError extends Error {
  /**
   * Error code for categorizing the error
   */
  public readonly code: string;

  /**
   * Additional context information about the error
   */
  public readonly context: Record<string, any>;

  /**
   * Create a new parser error
   *
   * @param message - Error message
   * @param code - Error code
   * @param context - Additional context information
   */
  constructor(message: string, code: string = 'PARSER_ERROR', context: Record<string, any> = {}) {
    super(message);
    this.name = 'ParserError';
    this.code = code;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ParserError.prototype);
  }

  /**
   * Add additional context to the error
   *
   * @param context - Context to add
   * @returns This error instance for chaining
   */
  public withContext(context: Record<string, any>): this {
    Object.assign(this.context, context);
    return this;
  }

  /**
   * Convert the error to a plain object for logging
   *
   * @returns Plain object representation of the error
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error for validation failures during parsing
 */
export class ValidationError extends ParserError {
  /**
   * Create a new validation error
   *
   * @param message - Error message
   * @param context - Additional context information
   */
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for file not found during parsing
 */
export class FileNotFoundError extends ParserError {
  /**
   * Create a new file not found error
   *
   * @param filePath - Path to the file that was not found
   * @param context - Additional context information
   */
  constructor(filePath: string, context: Record<string, any> = {}) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath, ...context });
    this.name = 'FileNotFoundError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

/**
 * Error for unsupported file types
 */
export class UnsupportedFileTypeError extends ParserError {
  /**
   * Create a new unsupported file type error
   *
   * @param fileType - Type of file that is not supported
   * @param context - Additional context information
   */
  constructor(fileType: string, context: Record<string, any> = {}) {
    super(`Unsupported file type: ${fileType}`, 'UNSUPPORTED_FILE_TYPE', { fileType, ...context });
    this.name = 'UnsupportedFileTypeError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, UnsupportedFileTypeError.prototype);
  }
}

/**
 * Error for parsing failures
 */
export class ParseError extends ParserError {
  /**
   * Create a new parse error
   *
   * @param message - Error message
   * @param context - Additional context information
   */
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'PARSE_ERROR', context);
    this.name = 'ParseError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

/**
 * Error for duplicate files
 */
export class DuplicateFileError extends ParserError {
  /**
   * Create a new duplicate file error
   *
   * @param fileHash - Hash of the file that is a duplicate
   * @param context - Additional context information
   */
  constructor(fileHash: string, context: Record<string, any> = {}) {
    super(`Duplicate file detected with hash: ${fileHash}`, 'DUPLICATE_FILE', { fileHash, ...context });
    this.name = 'DuplicateFileError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DuplicateFileError.prototype);
  }
}
