'use client';

import React from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  isLoading = false,
  loadingText,
  icon,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  // Handle keyboard navigation
  useKeyboard('Enter', (e) => {
    if (e.target === e.currentTarget && onClick && !disabled && !isLoading) {
      onClick(e as any);
    }
  });

  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 focus:ring-neutral-500',
    outline: 'border border-neutral-300 hover:bg-neutral-100 focus:ring-neutral-500',
  };

  const baseClasses = `
    inline-flex items-center justify-center px-4 py-2 rounded-md
    font-medium transition-colors duration-150 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}