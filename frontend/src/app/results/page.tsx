'use client';

import React from 'react';
import { useTasks } from '@/hooks/useTasks';
import InsightCard from '@/components/InsightCard';
import Button from '@/components/Button';
import Link from 'next/link';

export default function ResultsPage() {
  const { tasks, isLoading } = useTasks();
  
  // Sort tasks by creation date (newest first)
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-600">Analysis Results</h1>
          <p className="text-neutral-600 mt-2">View your generated insights and recommendations</p>
        </div>
        
        <Link href="/">
          <Button variant="outline">
            ← Back to Dashboard
          </Button>
        </Link>
      </header>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-lg font-medium text-neutral-900 mb-2">No analysis results yet</h2>
          <p className="text-neutral-600 mb-4">
            Submit your first analysis request to see results here.
          </p>
          <Link href="/">
            <Button>
              Create Analysis Request
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTasks.map((task) => (
            <InsightCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}