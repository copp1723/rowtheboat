'use client';

import React from 'react';
import Button from './Button';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useToast } from './Feedback/ToastContext';
import Skeleton from './Feedback/Skeleton';

export default function ApiKeysList() {
  const { apiKeys, isLoading, deleteApiKey } = useApiKeys();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="card">
        <h2>Your API Keys</h2>
        <div className="space-y-4">
          <Skeleton className="h-12" count={3} />
        </div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey.mutateAsync(id);
      showToast('API key deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete API key', 'error');
    }
  };

  if (apiKeys.length === 0) {
    return (
      <div className="card">
        <h2>Your API Keys</h2>
        <p className="text-neutral-600 mt-2">
          You haven't added any API keys yet. Add an API key to integrate with third-party services.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Your API Keys</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Service
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                API Key
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-neutral-200">
            {apiKeys.map((apiKey) => (
              <tr key={apiKey.id}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-medium text-neutral-900">
                    {apiKey.service}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-neutral-900">
                    {apiKey.label || apiKey.keyName}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-neutral-900">
                    {apiKey.keyValue}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(apiKey.id)}
                    isLoading={deleteApiKey.isPending && deleteApiKey.variables === apiKey.id}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
