'use client';

import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

export type ValidationRule<T> = {
  validate: (value: any, formData: T) => boolean;
  message: string;
};

export type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: FieldValidation<T>;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  formError: string | null;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: (name: keyof T, value: any) => void;
  setFormError: (error: string | null) => void;
  resetForm: () => void;
  validateField: (name: keyof T) => boolean;
  validateForm: () => boolean;
}

/**
 * Custom hook for form handling with validation
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validationRules = {} as FieldValidation<T>,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setFormError(null);
  }, [initialValues]);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T): boolean => {
      const fieldRules = validationRules[name];
      if (!fieldRules) return true;

      for (const rule of fieldRules) {
        if (!rule.validate(values[name], values)) {
          setErrors((prev) => ({ ...prev, [name]: rule.message }));
          return false;
        }
      }

      // Clear error if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
      
      return true;
    },
    [values, validationRules]
  );

  // Validate all form fields
  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    // Check each field with validation rules
    Object.keys(validationRules).forEach((fieldName) => {
      const name = fieldName as keyof T;
      const fieldRules = validationRules[name];
      
      if (!fieldRules) return;

      for (const rule of fieldRules) {
        if (!rule.validate(values[name], values)) {
          newErrors[fieldName] = rule.message;
          isValid = false;
          break;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  // Handle input changes
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      
      // Clear error when field is updated
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      
      // Clear form error when any field changes
      if (formError) {
        setFormError(null);
      }
    },
    [errors, formError]
  );

  // Set a field value programmatically
  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (errors[name as string]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      
      // Validate all fields
      if (!validateForm()) {
        return;
      }
      
      setIsSubmitting(true);
      setFormError(null);
      
      try {
        await onSubmit(values);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : 'An error occurred'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit]
  );

  return {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    setFormError,
    resetForm,
    validateField,
    validateForm,
  };
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule<any> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    },
    message,
  }),
  email: (message = 'Please enter a valid email address'): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true; // Let required validation handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),
  minLength: (length: number, message = `Must be at least ${length} characters`): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true; // Let required validation handle empty values
      return String(value).length >= length;
    },
    message,
  }),
  maxLength: (length: number, message = `Must be no more than ${length} characters`): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true; // Let required validation handle empty values
      return String(value).length <= length;
    },
    message,
  }),
};
