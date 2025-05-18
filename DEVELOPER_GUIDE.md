# AgentFlow Developer Onboarding Guide

Welcome to the AgentFlow project! This guide will help you set up your development environment and understand the codebase structure to get you up and running quickly.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Setup Instructions](#setup-instructions)
3. [Architecture Overview](#architecture-overview)
4. [Code Organization](#code-organization)
5. [Common Development Tasks](#common-development-tasks)
6. [Troubleshooting](#troubleshooting)
7. [Pre-commit Hooks: Linting and Testing](#pre-commit-hooks-linting-and-testing)

## Project Overview

AgentFlow is an AI agent backend that executes various tasks including web crawling, flight status checking, and dealer interactions. It's specifically designed for automotive dealerships to analyze CRM reports, generate insights, and distribute them via email to different stakeholders.

### Key Features

- Natural language task parsing
- Web crawling and content extraction
- CRM report ingestion (VinSolutions, VAUTO, DealerTrack)
- AI-powered insight generation
- Email notifications and OTP verification
- Scheduled report processing

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm (v7+)
- PostgreSQL database (or Supabase account)
- Git

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/agentflow.git
cd agentflow
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `EKO_API_KEY`: API key for Eko AI
- `SENDGRID_API_KEY`: API key for SendGrid (email)
- `OTP_EMAIL_USER`: Email for OTP verification
- `OTP_EMAIL_PASS`: Password for OTP email

4. **Set up the database**

```bash
npm run setup-key YOUR_FIRECRAWL_API_KEY
```

5. **Build the project**

```bash
npm run build
```

6. **Start the development server**

```bash
npm run dev
```

## Architecture Overview

AgentFlow follows a modular architecture with several key components:

### Core Components

1. **Task Parser**: Analyzes natural language input to determine task type and parameters
2. **Agent Engine**: Executes tasks using appropriate tools
3. **Email Service**: Handles email notifications and OTP verification
4. **Scheduler**: Manages scheduled tasks and workflows
5. **Database Layer**: Stores credentials, tasks, and workflow data

### Data Flow

1. User submits a task via API
2. Task parser analyzes and categorizes the task
3. Agent engine selects appropriate tools and executes the task
4. Results are stored in the database and notifications sent if configured
5. Scheduled tasks are managed by the scheduler service

## Code Organization

The codebase is organized into the following directories:

- `src/`: Source code
  - `agents/`: Agent implementation and flow execution
  - `api/`: API server and endpoints
  - `scripts/`: Utility scripts
  - `server/`: Server implementation and routes
  - `services/`: Core services (email, scheduler, etc.)
  - `shared/`: Shared utilities and database schema
  - `tools/`: Tool implementations (web crawling, etc.)
  - `utils/`: Utility functions

- `configs/`: Configuration files
- `dist/`: Compiled JavaScript files
- `public/`: Static files for web UI

## Common Development Tasks

### Adding a New Tool

1. Create a new file in `src/tools/`
2. Implement the tool interface
3. Register the tool in `src/index.ts`
4. Update the task parser to recognize tasks for this tool

Example:

```typescript
// src/tools/myNewTool.ts
export async function myNewTool(params: any): Promise<any> {
  // Tool implementation
  return result;
}
```

### Adding a New API Endpoint

1. Add the route to the appropriate router in `src/server/routes/`
2. Implement the route handler
3. Register the router in `src/api/server.ts`

Example:

```typescript
// src/server/routes/myRoute.ts
import { Router } from 'express';

const router = Router();

router.get('/my-endpoint', async (req, res) => {
  // Handler implementation
  res.json({ success: true });
});

export default router;
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Common Issues

#### TypeScript Errors

If you encounter TypeScript errors:

1. Make sure you have the latest dependencies: `npm install`
2. Check for type definition issues: `npm run check-types`
3. Fix any identified issues in the relevant files

#### Database Connection Issues

If you have trouble connecting to the database:

1. Verify your `.env` file has the correct `DATABASE_URL`
2. Ensure the database server is running
3. Check network connectivity and firewall settings

#### Email Service Issues

If email notifications aren't working:

1. Verify your SendGrid API key is correct
2. Check the email queue status in the database
3. Look for errors in the logs

### Getting Help

If you need assistance:

1. Check the project documentation
2. Review existing issues on GitHub
3. Reach out to the team on Slack

## Pre-commit Hooks: Linting and Testing

AgentFlow uses a pre-commit hook to enforce code quality. Before any commit, the following checks are run automatically:

- **Linting**: Ensures code style and formatting standards are met (`npm run lint`).
- **Testing**: Runs the test suite to catch regressions (`npm test`).

If either step fails, the commit will be blocked. This helps maintain a healthy codebase and prevents broken code from being committed.

### How it Works

The pre-commit hook is managed by [Husky](https://typicode.github.io/husky/). You can find the hook script in `.husky/pre-commit`.

**Typical workflow:**

1. Make your code changes.
2. Stage your changes with `git add`.
3. Run `git commit ...`.
4. Husky will automatically run linting and tests. If both pass, the commit succeeds. If not, fix the issues and try again.

### Troubleshooting

- If you want to skip the hook (not recommended), use `git commit --no-verify`.
- If you encounter issues with Husky, try reinstalling hooks with `npx husky install`.

---

Happy coding! If you have any questions or need further assistance, please don't hesitate to ask.
