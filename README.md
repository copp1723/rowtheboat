# Row The Boat

A flexible AI agent backend for automotive dealerships that analyzes CRM reports, generates insights, and distributes them via email to different stakeholders.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Environment Setup](#environment-setup)
4. [Development](#development)
   - [Running Locally](#running-locally)
   - [Testing](#testing)
   - [Code Organization](#code-organization)
5. [Documentation](#documentation)
6. [Scripts Reference](#scripts-reference)
7. [Troubleshooting](#troubleshooting)
8. [Contributing](#contributing)

## Project Overview

Row The Boat is an AI agent backend specifically designed for automotive dealerships to analyze CRM reports, generate insights, and distribute them via email to different stakeholders. The system ingests files from various sources (primarily email), processes them, and generates actionable insights.

## Features

- **Natural language task parsing**: Analyze natural language input to determine task type and parameters
- **Web crawling and content extraction**: Extract data from web sources
- **CRM report ingestion**: Support for VinSolutions, VAUTO, DealerTrack
- **AI-powered insight generation**: Generate actionable insights from CRM data
- **Email notifications and OTP verification**: Secure communication with stakeholders
- **Scheduled report processing**: Automate report processing on a schedule

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v7+)
- PostgreSQL database (or Supabase account)
- Redis (for job queues)
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/rowtheboat.git
cd rowtheboat
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

See [Environment Variables Documentation](docs/ENVIRONMENT_VARIABLES.md) for details on required and optional variables.

4. **Set up the database**

```bash
npm run migrate
```

5. **Build the project**

```bash
npm run build
```

### Environment Setup

For detailed information about environment variables and configuration, see the [Environment Variables Documentation](docs/ENVIRONMENT_VARIABLES.md).

## Development

### Running Locally

Start the development server:

```bash
npm run dev
```

This will start the application in development mode with hot reloading.

### Testing

The project includes unit, integration, and end-to-end tests.

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Generate test coverage report
npm run test:coverage
```

For more information about testing, see the [Testing Documentation](docs/TESTING.md).

### Code Organization

The codebase is organized into the following directories:

- `src/`: Source code
  - `api/`: API server and endpoints
  - `config/`: Configuration files and schemas
  - `core/`: Core business logic
  - `features/`: Feature-based modules
  - `services/`: Core services (email, scheduler, etc.)
  - `shared/`: Shared utilities and database schema
  - `utils/`: Utility functions

- `tests/`: Test files
  - `unit/`: Unit tests
  - `integration/`: Integration tests
  - `e2e/`: End-to-end tests

- `docs/`: Documentation files

For more details on code organization, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md): System architecture and components
- [API Documentation](docs/API.md): API endpoints and usage
- [Configuration](docs/CONFIGURATION.md): Configuration options and schemas
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md): Required and optional environment variables
- [Testing](docs/TESTING.md): Testing structure and guidelines
- [Monitoring](docs/MONITORING.md): Monitoring and alerting system
- [Security](docs/SECURITY_HARDENING.md): Security features and best practices
- [Type Safety Policy](docs/TYPE_SAFETY_POLICY.md): Type safety guidelines and exceptions
- [Developer Guide](DEVELOPER_GUIDE.md): Comprehensive developer onboarding guide

## Scripts Reference

| Script | Description | When to Use |
|--------|-------------|-------------|
| `npm run dev` | Start development server | Local development |
| `npm run build` | Build the application | Before production deployment |
| `npm run start` | Start production server | Production deployment |
| `npm test` | Run all tests | CI/CD, before commits |
| `npm run test:unit` | Run unit tests | Testing specific units |
| `npm run test:integration` | Run integration tests | Testing component integration |
| `npm run test:e2e` | Run end-to-end tests | Testing full workflows |
| `npm run test:coverage` | Generate test coverage | Assessing test coverage |
| `npm run migrate` | Run database migrations | After schema changes |
| `npm run lint` | Run ESLint | Code quality checks |
| `npm run lint:fix` | Fix ESLint issues | Automatically fix linting issues |
| `npm run type-check` | Run TypeScript type check | Verify type safety |

For a complete list of scripts, see the [Scripts Documentation](docs/SCRIPTS.md).

## Troubleshooting

For common issues and their solutions, see the [Troubleshooting Guide](docs/TROUBLESHOOTING.md).

## Stub and Mock Implementations

> **Note:** This project uses stub and mock modules for some critical services to improve developer experience and onboarding. These stubs:
> - Log all usage with `[STUB]` for easy search
> - Return mock data or fail gracefully (never crash the app)
> - Are annotated with `@stub` and `@mock` in JSDoc
> - Are safe for development, onboarding, and CI
>
> See [`docs/STUBS_AND_MOCKS.md`](docs/STUBS_AND_MOCKS.md) for a full inventory, expected impact, and swap-out instructions.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

For more details, see the [Contributing Guide](CONTRIBUTING.md).
