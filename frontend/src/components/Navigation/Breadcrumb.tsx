'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return null;

  return (
    <nav className="mb-6 text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/"
            className="text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Dashboard
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          const path = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          
          // Format the segment for display
          const label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return (
            <React.Fragment key={path}>
              <li className="text-neutral-400">/</li>
              <li>
                {isLast ? (
                  <span className="font-medium text-primary-600" aria-current="page">
                    {label}
                  </span>
                ) : (
                  <Link
                    href={path}
                    className="text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}