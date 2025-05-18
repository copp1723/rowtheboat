'use client';

import React from 'react';
import { Task } from '@/lib/api';
import Skeleton from './Feedback/Skeleton';

interface InsightCardProps {
  task: Task;
  isLoading?: boolean;
}

export default function InsightCard({ task, isLoading }: InsightCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-4 w-2/3 mb-8" />
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (!task.result) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">
            {task.taskType}
          </h2>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
            ${task.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-800'}`}
          >
            {task.status}
          </span>
        </div>
        
        <div className="mt-4">
          {task.status === 'processing' ? (
            <div className="flex items-center space-x-3 text-blue-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Analysis in progress...</span>
            </div>
          ) : (
            <p className="text-neutral-500">No results available</p>
          )}
        </div>
        
        {task.error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{task.error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const score = task.result.score ?? 0;
  const scoreColor = score >= 8 ? 'text-green-500' : score >= 5 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = score >= 8 ? 'bg-green-50' : score >= 5 ? 'bg-yellow-50' : 'bg-red-50';

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">
          {task.result.title || `Analysis for ${task.taskType}`}
        </h2>
        
        {task.result.score !== undefined && (
          <div className={`flex items-center ${scoreBg} px-3 py-1 rounded-full`}>
            <span className={`text-sm font-medium ${scoreColor}`}>
              Quality Score: {task.result.score}/10
            </span>
          </div>
        )}
      </div>
      
      {task.result.description && (
        <p className="text-neutral-700 mb-6 leading-relaxed">
          {task.result.description}
        </p>
      )}
      
      {task.result.insights && task.result.insights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-3">
            Key Insights
          </h3>
          <ul className="space-y-3">
            {task.result.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <svg className="h-6 w-6 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-neutral-700">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {task.result.actionItems && task.result.actionItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-3">
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            {task.result.actionItems.map((action, idx) => (
              <li key={idx} className="flex items-start space-x-3">
                <svg className="h-6 w-6 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-neutral-700">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="pt-4 mt-6 border-t border-neutral-200">
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Completed: {new Date(task.completedAt || task.createdAt).toLocaleString()}
          </span>
          <span>
            Duration: {task.completedAt ? 
              Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 1000) + 's' 
              : 'In Progress'}
          </span>
        </div>
      </div>
    </div>
  );
}