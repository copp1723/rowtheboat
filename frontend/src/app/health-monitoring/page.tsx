'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';

interface HealthSummary {
  overallStatus: 'ok' | 'warning' | 'error';
  servicesCount: number;
  servicesOk: number;
  servicesWarning: number;
  servicesError: number;
  averageResponseTime: number;
  lastChecked: string | null;
}

interface HealthCheck {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error';
  responseTime: number;
  lastChecked: string;
  message?: string;
  details?: Record<string, any>;
}

export default function HealthMonitoringPage() {
  const queryClient = useQueryClient();
  const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);
  
  // Fetch health summary
  const { 
    data: summary,
    isLoading: summaryLoading,
    error: summaryError 
  } = useQuery<HealthSummary>({
    queryKey: ['health-summary'],
    queryFn: async () => {
      const res = await fetch('/api/health-monitoring/summary');
      if (!res.ok) throw new Error('Failed to fetch health summary');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Fetch all health checks
  const { 
    data: healthChecks,
    isLoading: checksLoading,
    error: checksError
  } = useQuery<HealthCheck[]>({
    queryKey: ['health-checks'],
    queryFn: async () => {
      const res = await fetch('/api/health-monitoring/checks');
      if (!res.ok) throw new Error('Failed to fetch health checks');
      const data = await res.json();
      // Convert date strings to Date objects
      return data.map((check: any) => ({
        ...check,
        lastChecked: new Date(check.lastChecked).toISOString()
      }));
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Fetch health logs for a specific check
  const { 
    data: healthLogs,
    isLoading: logsLoading,
    error: logsError
  } = useQuery({
    queryKey: ['health-logs', currentCheckId],
    queryFn: async () => {
      if (!currentCheckId) return null;
      const res = await fetch(`/api/health-monitoring/logs/${currentCheckId}`);
      if (!res.ok) throw new Error('Failed to fetch health logs');
      return res.json();
    },
    enabled: !!currentCheckId,
    refetchInterval: currentCheckId ? 30000 : false // Refresh every 30 seconds if a check is selected
  });
  
  // Run all health checks
  const runAllChecks = async () => {
    try {
      await fetch('/api/health-monitoring/checks/run', { method: 'POST' });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      queryClient.invalidateQueries({ queryKey: ['health-checks'] });
      if (currentCheckId) {
        queryClient.invalidateQueries({ queryKey: ['health-logs', currentCheckId] });
      }
    } catch (error) {
      console.error('Failed to run health checks:', error);
    }
  };
  
  // Run a specific health check
  const runCheck = async (id: string) => {
    try {
      await fetch(`/api/health-monitoring/checks/${id}/run`, { method: 'POST' });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['health-summary'] });
      queryClient.invalidateQueries({ queryKey: ['health-checks'] });
      queryClient.invalidateQueries({ queryKey: ['health-logs', id] });
    } catch (error) {
      console.error(`Failed to run health check ${id}:`, error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm:ss a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Format time ago for display
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };
  
  // Get status color
  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusTitle = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'Operational';
      case 'warning':
        return 'Performance Issues';
      case 'error':
        return 'Service Disruption';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Health Dashboard</h1>
          <p className="text-gray-600">
            Monitor the health and performance of all system components
          </p>
        </div>
        <div>
          <Link href="/" className="text-blue-600 hover:text-blue-800 mr-4">
            Back to Home
          </Link>
          <button
            onClick={runAllChecks}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Run All Checks
          </button>
        </div>
      </div>
      
      {/* System Health Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">System Health Summary</h2>
        
        {summaryLoading ? (
          <div className="text-center py-4">Loading summary...</div>
        ) : summaryError ? (
          <div className="text-center py-4 text-red-600">
            Failed to load health summary
          </div>
        ) : summary ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mr-2 ${getStatusColor(summary.overallStatus)}`}>
                  {getStatusTitle(summary.overallStatus)}
                </div>
                <span className="text-gray-600">
                  Last checked: {summary.lastChecked ? formatTimeAgo(summary.lastChecked) : 'Never'}
                </span>
              </div>
              <div className="text-gray-600">
                Average response time: {summary.averageResponseTime.toFixed(2)} ms
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {summary.servicesOk}
                </div>
                <div className="text-sm text-gray-700">Services OK</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {summary.servicesWarning}
                </div>
                <div className="text-sm text-gray-700">Services with Warnings</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {summary.servicesError}
                </div>
                <div className="text-sm text-gray-700">Services with Errors</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-600">
            No health data available
          </div>
        )}
      </div>
      
      {/* Service Health Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Service Health Checks</h2>
          
          {checksLoading ? (
            <div className="text-center py-4">Loading health checks...</div>
          ) : checksError ? (
            <div className="text-center py-4 text-red-600">
              Failed to load health checks
            </div>
          ) : healthChecks && healthChecks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Checked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {healthChecks.map((check) => (
                    <tr 
                      key={check.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${currentCheckId === check.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setCurrentCheckId(check.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{check.name}</div>
                        <div className="text-sm text-gray-500">{check.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(check.status)}`}>
                          {getStatusTitle(check.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {check.responseTime} ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimeAgo(check.lastChecked)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runCheck(check.id);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Run Check
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600">
              No health checks available
            </div>
          )}
        </div>
        
        {/* Health Check Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {currentCheckId ? (
              <>
                {healthChecks?.find(c => c.id === currentCheckId)?.name} Details
              </>
            ) : (
              'Service Details'
            )}
          </h2>
          
          {!currentCheckId ? (
            <div className="text-center py-8 text-gray-600">
              Select a service to view details
            </div>
          ) : logsLoading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : logsError ? (
            <div className="text-center py-8 text-red-600">
              Failed to load service logs
            </div>
          ) : healthLogs && healthLogs.length > 0 ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Recent Logs</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto p-2">
                  {healthLogs.slice(0, 10).map((log: any) => (
                    <div 
                      key={log.id}
                      className={`p-3 rounded-lg text-sm ${getStatusColor(log.status)}`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">{getStatusTitle(log.status)}</span>
                        <span>{formatTimeAgo(log.timestamp)}</span>
                      </div>
                      <div>{log.message || 'No message'}</div>
                      <div className="text-xs mt-1">Response time: {log.responseTime} ms</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Service Details */}
              {healthChecks && currentCheckId && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Configuration</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {healthChecks.find(c => c.id === currentCheckId)?.details && (
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(
                          healthChecks.find(c => c.id === currentCheckId)?.details,
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No logs available for this service
            </div>
          )}
        </div>
      </div>
    </div>
  );
}