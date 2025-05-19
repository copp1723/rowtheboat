# Stub and Mock Implementations Inventory

_Last updated: 2025-05-18_

This document lists all current stub and mock modules in the codebase, their implementation status, expected impact, and instructions for swapping out with real implementations.

---

## Critical Stubs/Mocks

### 1. `src/services/stepHandlers.ts`
- **Status:** Partial mock
- **Handlers:** `email`, `http`, `dataProcessing`, `delay`
- **Behavior:** All handlers log a `[STUB]` warning and return mock data. No real side effects.
- **Impact:** Workflow steps will not perform real actions. Safe for development/testing.
- **Swap-out:** Replace handler logic with real implementations as needed.

### 2. `src/services/alertMailer.ts`
- **Status:** Partial mock
- **Functions:** `sendAdminAlert`, `sendImmediateAdminAlert`, `configureAlertRecipients`, `configureAlertThresholds`
- **Behavior:** All functions log a `[STUB]` warning and return `true` (mock success).
- **Impact:** No real alert emails sent or config changes made. Safe for development/testing.
- **Swap-out:** Replace with real mailer logic for production.

### 3. `src/services/attachmentParsers.ts`
- **Status:** Partial mock
- **Functions:** `parseByExtension`, `parseCSV`, `parseExcel`, `parsePDF`
- **Behavior:** All functions log a `[STUB]` warning and return mock parsed data.
- **Impact:** No real file parsing. Use only for development/testing.
- **Swap-out:** Replace with real parser logic for production.

### 4. `src/services/awsKmsService.ts`
- **Status:** Partial mock
- **Functions:** `initializeKmsService`, `createKey`, `scheduleKeyDeletion`, `logSecurityEvent`
- **Behavior:** All functions log a `[STUB]` warning and return mock data or resolve immediately.
- **Impact:** No real AWS KMS operations. Safe for development/testing.
- **Swap-out:** Replace with real AWS KMS integration for production.

---

## How to Find Stub/Mock Usage
- All stub/mock calls are logged with `[STUB]` in the log message for easy search.
- All stub/mock functions are annotated with `@stub` and `@mock` in their JSDoc.

## Swap-out Instructions
- Replace the function body with real implementation.
- Remove the `@stub`/`@mock` annotation and update this document.

## Impact on Development/Testing
- Main workflows will not crash due to missing implementations.
- All stubbed modules fail gracefully or return mock data.
- Safe for onboarding, CI, and local development.

---

For more details, see the `README.md` and in-file JSDoc annotations.
