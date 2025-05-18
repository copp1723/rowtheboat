# Row The Boat

A clean, production-ready codebase for the Row The Boat project, migrated from the original AgentFlow repository.

## Overview

Row The Boat is a streamlined version of the AgentFlow project, focusing on core functionality and removing legacy code, test files, temporary assets, and duplicate implementations to ensure a maintainable codebase.

## Features

- **Unified Parser System**: Memory-efficient parsing for CSV, XLSX, and PDF files
- **OpenAI Integration**: Versioned prompt templates, audit logging, and cost tracking
- **Row-Level Security**: PostgreSQL RLS for secure multi-tenant data access
- **Email Processing**: Email ingestion and notification system
- **Task Scheduling**: Automated workflow scheduling and execution
- **Monitoring**: Comprehensive monitoring and observability

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for job queue)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/row-the-boat.git
   cd row-the-boat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

- `src/` - Backend source code
  - `api/` - API server implementation
  - `config/` - Configuration management
  - `core/` - Core functionality (AI, etc.)
  - `features/` - Feature-specific code
  - `middleware/` - Express middleware
  - `migrations/` - Database migrations
  - `parsers/` - Unified parser system
  - `server/` - Server routes
  - `services/` - Core services
  - `shared/` - Shared utilities
  - `utils/` - Utility functions

- `frontend/` - Frontend source code
  - `src/app/` - Next.js app directory
  - `src/components/` - React components
  - `src/hooks/` - React hooks
  - `src/lib/` - Frontend utilities

- `docs/` - Documentation
  - `guides/` - User guides
  - `openapi/` - API documentation

## Documentation

For more detailed information, see the following documentation:

- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Security Implementation](docs/SECURITY_HARDENING.md)
- [Row-Level Security](docs/ROW_LEVEL_SECURITY.md)
- [Parser Integration](docs/PARSER_INTEGRATION_CHECKLIST.md)

## License

[Specify your license here]

## Acknowledgements

This project is a curated version of the original AgentFlow codebase, focusing on maintainability and production readiness.
