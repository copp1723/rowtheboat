'use client';

import React from 'react';
import Button from './Button';
import Select from './Select';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { TaskInput } from '@/lib/api';
import { useCredentials } from '@/hooks/useCredentials';
import { useToast } from './Feedback/ToastContext';
import { useForm, validationRules } from '@/hooks/useForm';
import FormWrapper from './Form/FormWrapper';
import Card from './UI/Card';

const intentOptions = [
  { value: 'inventoryAging', label: 'Inventory Aging' },
  { value: 'salesTrends', label: 'Sales Trends' },
  { value: 'customerAnalysis', label: 'Customer Analysis' },
  { value: 'leadPerformance', label: 'Lead Performance' },
];

export default function TaskForm() {
  const router = useRouter();
  const { createTask } = useTasks();
  const { credentials } = useCredentials();
  const { showToast } = useToast();

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit
  } = useForm<TaskInput>({
    initialValues: {
      taskType: 'analyzeCRMData',
      taskText: intentOptions[0].value,
      platform: credentials[0]?.platform || '',
    },
    validationRules: {
      taskText: [validationRules.required('Intent is required')],
      platform: [validationRules.required('Platform is required')],
    },
    onSubmit: async (values) => {
      try {
        const result = await createTask.mutateAsync(values);
        showToast('Analysis task created successfully', 'success');
        router.push(`/results/${result.id}`);
      } catch (error) {
        showToast('Failed to create analysis task', 'error');
        throw new Error('Failed to create task. Please try again.');
      }
    },
  });

  return (
    <FormWrapper
      title="Request Analysis"
      onSubmit={handleSubmit}
      error={formError}
      isSubmitting={isSubmitting}
      className="max-w-lg mx-auto"
    >
      <Select
        label="Platform"
        name="platform"
        options={credentials.map(cred => ({ value: cred.platform, label: cred.platform }))}
        value={values.platform}
        onChange={handleChange}
        error={errors.platform}
        required
      />

      <Select
        label="What insights do you need?"
        name="taskText"
        options={intentOptions}
        value={values.taskText}
        onChange={handleChange}
        error={errors.taskText}
        required
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting || createTask.isPending}
      >
        {isSubmitting || createTask.isPending ? 'Creating Analysis...' : 'Generate Insights'}
      </Button>
    </FormWrapper>
  );
}