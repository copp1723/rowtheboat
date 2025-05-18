'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  workflowId?: string;
  errorMessage?: string;
  attempts?: number;
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching email logs
    // In a real app, this would make an API call to your backend
    setLoading(true);
    
    const fetchEmailLogs = async () => {
      try {
        // In a real implementation, we would fetch logs from the API
        // const response = await fetch('/api/emails/logs');
        // const data = await response.json();
        // if (response.ok) {
        //   setLogs(data.logs);
        // } else {
        //   throw new Error(data.message || 'Failed to fetch email logs');
        // }
        
        // Demo data for UI development purposes
        const mockLogs: EmailLog[] = [
          {
            id: '1',
            recipientEmail: 'user@example.com',
            subject: 'Workflow #12345 Completed',
            status: 'sent',
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            workflowId: '12345'
          },
          {
            id: '2',
            recipientEmail: 'admin@company.com',
            subject: 'Workflow #12344 Failed',
            status: 'sent',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            workflowId: '12344'
          },
          {
            id: '3',
            recipientEmail: 'support@example.com',
            subject: 'Workflow #12343 Completed',
            status: 'failed',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            workflowId: '12343',
            errorMessage: 'Failed to connect to mail server',
            attempts: 3
          }
        ];
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLogs(mockLogs);
      } catch (err) {
        console.error('Error fetching email logs:', err);
        setError('Failed to load email logs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmailLogs();
  }, []);

  const retryEmail = async (emailId: string) => {
    try {
      setError(null);
      console.log(`Retrying email with ID: ${emailId}`);
      
      // In a real app, this would call your backend API
      // const response = await fetch(`/api/emails/retry/${emailId}`, {
      //   method: 'POST',
      // });
      // 
      // const data = await response.json();
      // if (!response.ok) {
      //   throw new Error(data.message || 'Failed to retry email');
      // }
      
      // Show loading state
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === emailId ? { ...log, status: 'pending' } : log
        )
      );
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful retry
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === emailId ? { ...log, status: 'sent', errorMessage: undefined } : log
        )
      );
    } catch (err) {
      setError('Failed to retry sending the email. Please try again.');
      console.error('Error retrying email:', err);
    }
  };

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">Email Logs</h1>
        
        {/* Back to notifications link with button styling */}
        <div className="mb-4">
          <Link 
            href="/email-notifications" 
            className="inline-flex items-center px-4 py-2 bg-white border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Notifications
          </Link>
        </div>
        
        <p className="text-neutral-600">View and manage email delivery status</p>
      </header>
      
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold">Recent Emails</h2>
          <span className="text-sm text-gray-500">{logs.length} emails</span>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No email logs found
          </div>
        ) : (
          <div className="divide-y">
            {logs.map(log => (
              <div key={log.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{log.subject}</h3>
                    <p className="text-sm text-gray-600">To: {log.recipientEmail}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    log.status === 'sent' 
                      ? 'bg-green-100 text-green-800'
                      : log.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-xs text-gray-500">
                    <span>Sent: {formatDate(log.createdAt)}</span>
                    {log.attempts && log.attempts > 1 && (
                      <span className="ml-3">Attempts: {log.attempts}</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {log.workflowId && (
                      <Link
                        href={`/results/${log.workflowId}`}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        View Workflow
                      </Link>
                    )}
                    
                    {log.status === 'failed' && (
                      <button
                        onClick={() => retryEmail(log.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Retry Sending
                      </button>
                    )}
                  </div>
                </div>
                
                {log.errorMessage && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    {log.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}