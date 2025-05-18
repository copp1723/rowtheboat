'use client';

import React from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import { ApiKeyInput } from '@/lib/api';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useForm, validationRules } from '@/hooks/useForm';
import FormWrapper from './Form/FormWrapper';

const services = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads' },
  { value: 'twitter_ads', label: 'Twitter Ads' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
  { value: 'custom', label: 'Custom Integration' },
];

export default function ApiKeyForm() {
  const { createApiKey } = useApiKeys();

  const {
    values,
    errors,
    formError,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm
  } = useForm<ApiKeyInput>({
    initialValues: {
      service: services[0].value,
      keyName: '',
      keyValue: '',
      label: '',
    },
    validationRules: {
      service: [validationRules.required('Service is required')],
      keyName: [validationRules.required('Key name is required')],
      keyValue: [validationRules.required('API key is required')],
    },
    onSubmit: async (values) => {
      await createApiKey.mutateAsync(values);
      resetForm();
    },
  });

  // Show additional fields based on service
  const showAdditionalFields = values.service === 'google_ads' || values.service === 'facebook_ads';

  return (
    <FormWrapper
      title="Add API Key"
      description="Add an API key for third-party integrations"
      onSubmit={handleSubmit}
      error={formError}
      isSubmitting={isSubmitting}
    >
      <Select
        label="Service"
        name="service"
        options={services}
        value={values.service}
        onChange={handleChange}
        error={errors.service}
        required
      />

      <Input
        label="Key Name"
        name="keyName"
        type="text"
        placeholder="Enter a name for this API key"
        value={values.keyName}
        onChange={handleChange}
        error={errors.keyName}
        required
      />

      <Input
        label="API Key"
        name="keyValue"
        type="password"
        placeholder="Enter your API key"
        value={values.keyValue}
        onChange={handleChange}
        error={errors.keyValue}
        required
      />

      <Input
        label="Label (Optional)"
        name="label"
        type="text"
        placeholder="Enter a label for this API key"
        value={values.label || ''}
        onChange={handleChange}
        error={errors.label}
      />

      {showAdditionalFields && (
        <>
          <Input
            label="Client ID (Optional)"
            name="additionalData.clientId"
            type="text"
            placeholder="Enter your client ID"
            value={values.additionalData?.clientId || ''}
            onChange={handleChange}
          />

          <Input
            label="Client Secret (Optional)"
            name="additionalData.clientSecret"
            type="password"
            placeholder="Enter your client secret"
            value={values.additionalData?.clientSecret || ''}
            onChange={handleChange}
          />
        </>
      )}

      <Button
        type="submit"
        className="w-full mt-2"
        isLoading={isSubmitting || createApiKey.isPending}
      >
        Save API Key
      </Button>
    </FormWrapper>
  );
}
