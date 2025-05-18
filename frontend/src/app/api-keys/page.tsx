'use client';

import React, { useState } from 'react';
import ApiKeyForm from '@/components/ApiKeyForm';
import ApiKeysList from '@/components/ApiKeysList';
import Link from 'next/link';

export default function ApiKeysPage() {
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-600">API Keys</h1>
            <p className="text-neutral-600 mt-2">
              Manage your API keys for third-party integrations
            </p>
          </div>
          <Link
            href="/"
            className="text-primary-500 hover:text-primary-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your API Keys</h2>
        <button
          onClick={() => setShowApiKeyForm(!showApiKeyForm)}
          className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
        >
          {showApiKeyForm ? 'Hide Form' : 'Add API Key'}
        </button>
      </div>

      {showApiKeyForm && (
        <div className="mb-6">
          <ApiKeyForm />
        </div>
      )}

      <ApiKeysList />

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">About API Keys</h2>
        <p className="text-neutral-600 mb-4">
          API keys are used to authenticate your requests to third-party services. They allow the system to access data from these services on your behalf.
        </p>
        <h3 className="text-lg font-medium mb-2">Supported Integrations</h3>
        <ul className="list-disc pl-5 space-y-2 text-neutral-600">
          <li>
            <strong>Google Ads</strong> - Access your Google Ads data for analysis
          </li>
          <li>
            <strong>Facebook Ads</strong> - Integrate with your Facebook advertising account
          </li>
          <li>
            <strong>LinkedIn Ads</strong> - Connect to your LinkedIn marketing campaigns
          </li>
          <li>
            <strong>Twitter Ads</strong> - Analyze your Twitter advertising performance
          </li>
          <li>
            <strong>TikTok Ads</strong> - Access your TikTok advertising metrics
          </li>
          <li>
            <strong>Custom Integration</strong> - Add your own custom API integration
          </li>
        </ul>
      </div>
    </div>
  );
}
