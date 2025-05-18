'use client';

import React from 'react';
import TaskForm from '@/components/TaskForm';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary-600">Insight Engine</h1>
        <p className="text-neutral-600 mt-2">Generate valuable insights from your automotive CRM data</p>
      </header>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <TaskForm />
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold">Recent Analyses</h2>
          <Link 
            href="/results" 
            className="inline-block mt-2 text-primary-500 hover:text-primary-700 font-medium"
          >
            View All Results →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold">Email Notifications</h2>
          <p className="text-neutral-600 mt-1 mb-2 text-sm">Configure notification settings for workflow completions</p>
          <Link 
            href="/email-notifications" 
            className="inline-block mt-2 text-primary-500 hover:text-primary-700 font-medium"
          >
            Manage Notifications →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold">System Health</h2>
          <p className="text-neutral-600 mt-1 mb-2 text-sm">Monitor the health and performance of system components</p>
          <Link 
            href="/health-monitoring" 
            className="inline-block mt-2 text-primary-500 hover:text-primary-700 font-medium"
          >
            View Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}