# Security Hardening

This document describes the security hardening features implemented in the AgentFlow application.

## Key Management

### AWS KMS Integration

The application now integrates with AWS Key Management Service (KMS) for secure key management. This provides:

- Hardware-backed key storage
- Centralized key management
- Audit logging for all key operations
- Automatic key rotation

#### Configuration

AWS KMS integration can be configured using the following environment variables:

```
USE_AWS_KMS=true
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=your-key-id
AWS_KMS_KEY_ALIAS=alias/agentflow-encryption-key
AWS_KMS_AUTO_ROTATION_DAYS=90
```

If `USE_AWS_KMS` is set to `false` or not provided, the application will fall back to local encryption using the `ENCRYPTION_KEY` environment variable.

### Key Rotation

The application now supports automatic key rotation for both AWS KMS keys and locally managed encryption keys. This ensures that keys are regularly updated to minimize the risk of compromise.

#### Configuration

Key rotation can be configured using the following environment variables:

```
KEY_ROTATION_ENABLED=true
KEY_ROTATION_SCHEDULE="0 0 1 * *"  # Monthly on the 1st day at midnight
KEY_ROTATION_DAYS=90
KEY_ROTATION_NOTIFY_BEFORE_DAYS=7
```

### Key Versioning

All encryption keys now include version information, allowing the application to decrypt data encrypted with previous key versions. This ensures that data remains accessible even after key rotation.

## Access Control

### Role-Based Access Control (RBAC)

The application now implements role-based access control for API keys. Each API key is assigned a role that determines its permissions:

- **admin**: Full access to all resources
- **manager**: Can manage reports, insights, and workflows, but has limited access to API keys and users
- **user**: Can create and view reports, insights, and workflows, but cannot manage them
- **readonly**: Can only view reports, insights, and workflows

#### API Key Permissions

API keys can be assigned custom permissions that override the default permissions for their role. This allows for fine-grained access control.

### Audit Logging

All security-related events are now logged to the `security_audit_logs` table, including:

- API key creation, update, and deletion
- Permission checks and denials
- Encryption and decryption operations
- Authentication attempts

#### Log Levels

Security events are logged with one of the following severity levels:

- **info**: Informational events (e.g., successful operations)
- **warning**: Potential security issues (e.g., permission denied)
- **error**: Security errors (e.g., encryption failure)
- **critical**: Critical security issues (e.g., using default encryption key in production)

### Security Alert Thresholds

The application now defines thresholds for security events that trigger alerts when exceeded:

- Failed login attempts
- API key creation
- Permission denied events
- Encryption failures

#### Configuration

Security alert thresholds can be configured using the following environment variables:

```
ALERT_THRESHOLD_FAILED_LOGINS=5
ALERT_THRESHOLD_API_KEY_CREATION=3
ALERT_THRESHOLD_PERMISSION_DENIED=10
ALERT_THRESHOLD_ENCRYPTION_FAILURES=3
```

## Monitoring

### Security Event Monitoring

The application now includes a security monitoring service that regularly checks for security events and triggers alerts when thresholds are exceeded.

#### Configuration

Security monitoring can be configured using the following environment variables:

```
SECURITY_MONITORING_ENABLED=true
SECURITY_MONITORING_SCHEDULE="*/15 * * * *"  # Every 15 minutes
SECURITY_MONITORING_WINDOW_MINUTES=60
```

### Real-time Alerts

Security alerts are now sent in real-time when critical security events occur, such as:

- Multiple failed login attempts from the same IP address
- Excessive API key creation
- Multiple permission denied events
- Encryption failures

### Security Dashboard

A new security dashboard is available at `/api/security/dashboard` that provides an overview of the application's security status, including:

- Security event counts by severity
- Recent critical events
- API key statistics
- Login failure statistics
- Permission denied statistics

## Implementation Details

### Database Schema Updates

The API keys table has been updated to include the following new fields:

- `authTag`: Authentication tag for GCM mode encryption
- `keyVersion`: Version of the encryption key used
- `permissions`: RBAC permissions for this key
- `role`: Role for this key (admin, manager, user, readonly)
- `rotatedAt`: When this key was last rotated
- `rotationStatus`: Status of key rotation (active, pending_rotation, rotated)
- `previousKeyId`: Reference to previous version of this key

### New Services

The following new services have been implemented:

- `awsKmsService.ts`: Provides integration with AWS KMS
- `kmsEncryptionService.ts`: Provides encryption and decryption using AWS KMS
- `keyRotationService.ts`: Handles automatic key rotation
- `rbacService.ts`: Provides role-based access control
- `securityMonitoringService.ts`: Monitors security events and triggers alerts
- `securityInitializer.ts`: Initializes all security services

### Middleware

A new RBAC middleware has been implemented in `rbacMiddleware.ts` that provides:

- `requirePermission(resource, action)`: Middleware to check if a user has permission to access a resource
- `requireAdmin`: Middleware to require admin role

## Usage

### API Key Management

API keys can now be created with a role and custom permissions:

```javascript
const apiKey = await addApiKey(
  userId,
  service,
  keyName,
  keyValue,
  {
    label: 'My API Key',
    role: 'user',
    permissions: {
      reports: ['create', 'read', 'list'],
      insights: ['read', 'list'],
    },
  }
);
```

### Permission Checking

Routes can now require specific permissions:

```javascript
router.get('/reports', requirePermission('reports', 'list'), async (req, res) => {
  // Only users with 'list' permission for 'reports' can access this route
});
```

### Security Dashboard

The security dashboard is available at `/api/security/dashboard` and provides an overview of the application's security status.

## Conclusion

These security hardening features provide a robust foundation for securing the AgentFlow application. By implementing AWS KMS integration, key rotation, RBAC, and security monitoring, the application is now better protected against security threats.
