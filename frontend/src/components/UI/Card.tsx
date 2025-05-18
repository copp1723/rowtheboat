'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  headerAction?: ReactNode;
}

/**
 * A reusable card component with consistent styling
 */
export default function Card({
  title,
  subtitle,
  children,
  className = '',
  footer,
  headerAction,
}: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="flex justify-between items-center">
            <div>
              {title && <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>}
              {subtitle && <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}
      
      <div className="px-6 py-4">
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200">
          {footer}
        </div>
      )}
    </div>
  );
}
