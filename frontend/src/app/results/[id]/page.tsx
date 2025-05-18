'use client';

import React from 'react';
import { useTask } from '@/hooks/useTasks';
import InsightCard from '@/components/InsightCard';
import Button from '@/components/Button';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { task, isLoading, error } = useTask(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-600">Analysis Result</h1>
            <p className="text-neutral-600 mt-2">Loading your insight...</p>
          </div>
          
          <Link href="/results">
            <Button variant="outline">
              ← Back to Results
            </Button>
          </Link>
        </header>
        
        <div className="flex items-center justify-center p-8">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-600">Analysis Result</h1>
            <p className="text-neutral-600 mt-2">Error loading result</p>
          </div>
          
          <Link href="/results">
            <Button variant="outline">
              ← Back to Results
            </Button>
          </Link>
        </header>
        
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-lg font-medium text-neutral-900 mb-2">Error loading analysis result</h2>
          <p className="text-neutral-600 mb-4">
            {error instanceof Error ? error.message : 'The requested result could not be found.'}
          </p>
          <Link href="/results">
            <Button>
              View All Results
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If the task is still processing, poll for updates
  const isProcessing = task.status === 'pending' || task.status === 'processing';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-600">Analysis Result</h1>
          {isProcessing ? (
            <p className="text-neutral-600 mt-2">
              Processing your request... {task.status === 'pending' ? 'Waiting to start' : 'Analysis in progress'}
            </p>
          ) : (
            <p className="text-neutral-600 mt-2">
              {task.status === 'completed' ? 'Completed analysis' : 'Analysis failed'}
            </p>
          )}
        </div>
        
        <div className="space-x-2">
          <Link href="/">
            <Button variant="outline">
              ← New Analysis
            </Button>
          </Link>
          <Link href="/results">
            <Button variant="outline">
              All Results
            </Button>
          </Link>
        </div>
      </header>
      
      {isProcessing ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="flex flex-col items-center justify-center p-8">
            <svg className="animate-spin h-8 w-8 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-neutral-700">
              Please wait while we analyze your data. This may take a few moments...
            </p>
          </div>
        </div>
      ) : (
        <InsightCard task={task} />
      )}
    </div>
  );
}