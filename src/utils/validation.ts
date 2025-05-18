/**
 * Validation Utilities
 * 
 * Provides common validation functions for use across the application
 */

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate a phone number (simple version)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // This is a simple validation - adjust as needed for your requirements
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Check if a string is empty or only whitespace
 */
export function isEmptyString(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim() === '';
}

/**
 * Check if a value is null or undefined
 */
export function isNullOrUndefined(value: any): boolean {
  return value === null || value === undefined;
}

/**
 * Validate a password strength
 * Requires at least 8 characters, one uppercase, one lowercase, one number
 */
export function isStrongPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate a username
 * Alphanumeric characters, underscores, and hyphens, 3-30 characters
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate if a value is a number
 */
export function isNumber(value: any): boolean {
  return !isNaN(Number(value));
}

/**
 * Validate if a value is a positive number
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validate if a value is a non-negative number (zero or positive)
 */
export function isNonNegativeNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Validate if a value is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate if a string is within a length range
 */
export function isLengthInRange(str: string, minLength: number, maxLength: number): boolean {
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * Validate if a value is one of the allowed values
 */
export function isOneOf<T>(value: T, allowedValues: T[]): boolean {
  return allowedValues.includes(value);
}

/**
 * Create a validation schema for an object
 */
export type ValidationRule = (value: any) => boolean | string;

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule | ValidationRule[];
};

export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

/**
 * Validate an object against a schema
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  schema: ValidationSchema<T>
): ValidationResult {
  const errors: Record<string, string> = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    const ruleArray = Array.isArray(rules) ? rules : [rules];
    
    for (const rule of ruleArray) {
      const result = rule(value);
      
      if (typeof result === 'string') {
        errors[field] = result;
        break;
      } else if (result === false) {
        errors[field] = `Invalid value for ${field}`;
        break;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
