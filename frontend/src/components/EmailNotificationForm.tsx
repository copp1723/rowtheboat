'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from './Button';
import Input from './Input';
import { useForm, validationRules } from '@/hooks/useForm';
import FormWrapper from './Form/FormWrapper';

interface EmailNotificationFormProps {
  defaultEmail?: string;
}

interface EmailFormValues {
  email: string;
}

export default function EmailNotificationForm({ defaultEmail = '' }: EmailNotificationFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'execution'>('notifications');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFormError
  } = useForm<EmailFormValues>({
    initialValues: {
      email: defaultEmail,
    },
    validationRules: {
      email: [
        validationRules.required('Please enter an email address'),
        validationRules.email('Please enter a valid email address'),
      ],
    },
    onSubmit: async (values) => {
      setStatus('sending');

      try {
        // In a development/demo environment, we'll simulate a successful API call
        // This allows testing the UI without an actual backend connection

        // Uncomment this for actual API integration
        // const response = await fetch('/api/emails/test', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({ recipientEmail: values.email }),
        // });
        //
        // const data = await response.json();
        //
        // if (response.ok) {
        //   setStatus('sent');
        //   // Reset to idle after 3 seconds
        //   setTimeout(() => setStatus('idle'), 3000);
        // } else {
        //   setStatus('error');
        //   throw new Error(data.message || 'Failed to send test email');
        // }

        // Simulate API call for demo purposes
        console.log(`Demo mode: Would send email to ${values.email}`);

        // Simulate a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate success
        setStatus('sent');

        // Reset to idle after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } catch (err) {
        setStatus('error');
        setFormError(err instanceof Error ? err.message : 'An error occurred while sending the test email');
        console.error('Error sending test email:', err);
      }
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-600">
          Workflow Email Notification System
        </h2>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === 'notifications'}
          >
            Email Notifications
          </button>
          <button
            onClick={() => setActiveTab('execution')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'execution'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === 'execution'}
          >
            Task Execution
          </button>
        </div>

        {activeTab === 'notifications' && (
          <div className="max-w-md mx-auto">
            {status === 'sent' && (
              <div className="bg-green-50 text-green-800 p-3 rounded mb-4">
                Test email sent successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-800 p-3 rounded">
                  {formError}
                </div>
              )}

              <div>
                <Input
                  label="Recipient Email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  error={errors.email}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting || status === 'sending'}
              >
                {isSubmitting || status === 'sending' ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-200">
              <Link
                href="/email-logs"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
              >
                View Email Logs
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">No active tasks available</p>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to task creation using Next.js router
                router.push('/tasks/new');
              }}
            >
              Go run a workflow →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}