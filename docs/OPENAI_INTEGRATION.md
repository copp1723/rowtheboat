# OpenAI Integration

This document describes the OpenAI integration, prompt template system, and LLM audit logging capabilities implemented in the application.

## Table of Contents

1. [Overview](#overview)
2. [OpenAI Service](#openai-service)
3. [Prompt Template System](#prompt-template-system)
4. [LLM Audit Logging](#llm-audit-logging)
5. [Model Fallback](#model-fallback)
6. [Usage Examples](#usage-examples)
7. [Monitoring and Cost Management](#monitoring-and-cost-management)
8. [Migration from Eko AI](#migration-from-eko-ai)

## Overview

The OpenAI integration provides a comprehensive solution for interacting with OpenAI's API, managing prompt templates, and logging LLM interactions for audit and analysis purposes. The implementation includes:

- Direct OpenAI API integration with secure credential management
- Structured prompt template system with versioning and hot-reloading
- Comprehensive LLM audit logging for compliance and cost tracking
- Model fallback capabilities for service degradation scenarios
- Circuit breaker pattern for reliability

## OpenAI Service

The OpenAI service (`src/core/ai/openai.ts`) provides a centralized interface for interacting with the OpenAI API. It handles:

- Authentication with API keys from the credential vault
- Error handling and retry logic
- Circuit breaker integration
- Audit logging

### Initialization

```typescript
// Initialize with an API key
openai.initialize('your-api-key');

// Initialize with a credential from the vault
await openai.initializeWithCredential('credential-id', 'user-id');

// Initialize from environment variable
// This happens automatically if OPENAI_API_KEY is set
```

### Generating Completions

```typescript
const completion = await openai.generateCompletion('Your prompt', {
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.3,
  maxTokens: 1000,
  responseFormat: 'json_object',
  userId: 'user-id',
  promptVersion: 'v1.0.0',
  role: 'assistant',
});
```

## Prompt Template System

The prompt template system (`src/core/ai/promptTemplate.ts`) provides a structured way to manage and use prompt templates. It supports:

- YAML and JSON template formats
- Template versioning
- Hot-reloading of templates
- Variable substitution

### Template Structure

Templates can be stored as YAML or JSON files in the `src/prompts/templates` directory:

```yaml
version: "v1.0.0"
lastUpdated: "2024-05-15T00:00:00.000Z"
author: "AI Agent Team"
description: "Analyzes automotive sales data"
model: "gpt-4o"
temperature: 0.3
maxTokens: 1500
responseFormat: "json_object"
tags:
  - "automotive"
  - "sales"

systemPrompt: |
  You are an expert automotive analyst...

userPromptTemplate: |
  Analyze the following data:
  
  {data}
  
  Focus on identifying trends...

examples:
  - input:
      data: "..."
    output:
      summary: "..."
```

### Using Templates

```typescript
// Load a template
const template = await getPromptTemplate('automotive/sales_analysis');

// Fill a template with variables
const filled = fillPromptTemplate(template, { data: 'Your data here' });

// Generate from a template
const result = await generateFromTemplate('automotive/sales_analysis', {
  data: 'Your data here',
}, {
  model: 'gpt-4o',
  temperature: 0.3,
  useFallback: true,
});
```

## LLM Audit Logging

The LLM audit logging system (`src/core/ai/llmAuditLogger.ts`) provides comprehensive logging for LLM interactions. It tracks:

- Prompts and responses
- Token usage and costs
- Success/failure status
- Latency
- User and model information

### Database Schema

The `insight_logs` table has been enhanced with additional columns:

- `user_id` - User who made the request
- `model` - Model used for the request
- `prompt_tokens` - Number of tokens in the prompt
- `completion_tokens` - Number of tokens in the completion
- `total_tokens` - Total tokens used
- `cost` - Estimated cost of the request
- `metadata` - Additional metadata

### Usage Reporting

```typescript
// Get LLM usage statistics
const stats = await getLLMUsageStats({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  userId: 'user-id',
  model: 'gpt-4o',
});

// Get recent LLM interactions
const logs = await getRecentLLMInteractions({
  limit: 10,
  userId: 'user-id',
  success: true,
});
```

## Model Fallback

The model fallback system (`src/core/ai/modelFallback.ts`) provides fallback logic for LLM models, allowing the system to gracefully degrade when primary models are unavailable.

### Model Configuration

```typescript
const models = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    tier: 'primary',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1KTokensInput: 0.005,
    costPer1KTokensOutput: 0.015,
    capabilities: ['reasoning', 'code', 'creative', 'analysis'],
    enabled: true,
  },
  // Additional models...
];
```

### Using Fallback

```typescript
// Generate with fallback
const result = await modelFallbackManager.generateWithFallback('Your prompt', {
  modelId: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
  requiredCapabilities: ['reasoning', 'analysis'],
});
```

## Usage Examples

### Basic Usage

```typescript
import { openai, initializeAICore } from '../core/ai/index.js';

// Initialize the AI core
await initializeAICore();

// Generate a completion
const completion = await openai.generateCompletion('What is the capital of France?', {
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
});

console.log(completion); // "The capital of France is Paris."
```

### Using Templates

```typescript
import { generateFromTemplate, initializeAICore } from '../core/ai/index.js';

// Initialize the AI core
await initializeAICore();

// Generate from a template
const result = await generateFromTemplate('automotive/sales_analysis', {
  data: salesData,
}, {
  useFallback: true,
});

console.log(JSON.parse(result));
```

## Monitoring and Cost Management

The integration includes built-in monitoring and cost management features:

- Token usage tracking per request
- Cost calculation based on current OpenAI pricing
- Usage reporting by user, model, and time period
- Circuit breaker to prevent excessive API calls during failures

## Migration from Eko AI

If you're migrating from the Eko AI integration, follow these steps:

1. Update your code to use the new OpenAI service:

   ```typescript
   // Old Eko AI code
   const result = await ekoAI.generateInsight(data);
   
   // New OpenAI code
   const result = await generateFromTemplate('automotive/sales_analysis', { data });
   ```

2. Migrate your prompts to the new template system:

   - Create YAML or JSON files in `src/prompts/templates`
   - Include version information and metadata
   - Use the `systemPrompt` and `userPromptTemplate` fields

3. Update your error handling:

   - The new service includes built-in retry logic and circuit breaker
   - Check for specific error types using the `OpenAIErrorType` enum

4. Test thoroughly before removing the Eko AI integration
