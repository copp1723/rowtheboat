# Email Setup Guide

This guide will help you set up your email account for use with the Insight Engine. The system uses email to ingest CRM reports and generate insights.

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Email Account Setup](#email-account-setup)
   - [Gmail Setup](#gmail-setup)
   - [Outlook Setup](#outlook-setup)
   - [Other Email Providers](#other-email-providers)
4. [Security Considerations](#security-considerations)
5. [Vendor-Specific Instructions](#vendor-specific-instructions)
   - [VinSolutions](#vinsolutions)
   - [VAUTO](#vauto)
   - [CDK](#cdk)
   - [Reynolds](#reynolds)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

## Overview

The Insight Engine uses IMAP (Internet Message Access Protocol) to connect to your email account and retrieve CRM reports that are sent as attachments. This approach is more reliable and secure than browser automation, as it doesn't require storing your CRM platform credentials.

## Requirements

To set up email ingestion, you'll need:

1. An email account that receives CRM reports
2. IMAP access enabled for that email account
3. Email account credentials (username/password or app password)
4. IMAP server details (hostname, port, TLS settings)

## Email Account Setup

### Gmail Setup

1. **Enable IMAP in Gmail**:
   - Log in to your Gmail account
   - Click the gear icon (Settings) in the top right
   - Select "See all settings"
   - Go to the "Forwarding and POP/IMAP" tab
   - In the "IMAP Access" section, select "Enable IMAP"
   - Click "Save Changes"

2. **Create an App Password** (recommended for security):
   - Go to your [Google Account](https://myaccount.google.com/)
   - Select "Security" from the left menu
   - Under "Signing in to Google," select "2-Step Verification" (enable if not already)
   - At the bottom of the page, select "App passwords"
   - Select "Mail" as the app and "Other" as the device
   - Enter "Insight Engine" as the name
   - Click "Generate"
   - Copy the 16-character password that appears (you'll use this instead of your regular password)

3. **IMAP Settings for Gmail**:
   - IMAP Server: `imap.gmail.com`
   - Port: `993`
   - TLS: `Enabled`

### Outlook Setup

1. **Enable IMAP in Outlook.com**:
   - Log in to your Outlook.com account
   - Click the gear icon (Settings) in the top right
   - Select "View all Outlook settings"
   - Go to "Mail" > "Sync email"
   - Ensure IMAP is enabled
   - Click "Save"

2. **Create an App Password** (if using 2FA):
   - Go to your [Microsoft Account](https://account.microsoft.com/security)
   - Select "Security" from the top menu
   - Under "Advanced security options," select "App passwords"
   - Click "Create a new app password"
   - Copy the generated password

3. **IMAP Settings for Outlook**:
   - IMAP Server: `outlook.office365.com`
   - Port: `993`
   - TLS: `Enabled`

### Other Email Providers

For other email providers, you'll need to:

1. Check if IMAP access is enabled (usually in account settings)
2. Find the IMAP server hostname, port, and TLS settings (usually in help documentation)
3. Create an app password if you're using two-factor authentication

## Security Considerations

1. **Use App Passwords**: Instead of using your main account password, create an app-specific password when possible.
2. **Consider a Dedicated Email**: For production use, consider setting up a dedicated email account just for receiving CRM reports.
3. **Regular Password Rotation**: Change your app passwords periodically.
4. **Email Filters**: Set up email filters to organize CRM reports into specific folders.

## Vendor-Specific Instructions

### VinSolutions

1. **Configure Report Delivery**:
   - Log in to VinSolutions
   - Navigate to Reports > Report Scheduler
   - Set up the following reports to be emailed daily:
     - Inventory Aging Report
     - Sales Summary Report
     - Lead Activity Report
   - Set the delivery format to CSV or Excel
   - Enter your configured email address as the recipient

2. **Email Subject Format**:
   The system looks for emails with subjects containing "VinSolutions Report" or "Scheduled Report"

### VAUTO

1. **Configure Report Delivery**:
   - Log in to VAUTO
   - Navigate to Reports > Scheduled Reports
   - Set up the following reports to be emailed daily:
     - Inventory Report
     - Pricing Report
     - Market Days Supply Report
   - Set the delivery format to CSV or Excel
   - Enter your configured email address as the recipient

2. **Email Subject Format**:
   The system looks for emails with subjects containing "VAUTO Report" or "Automated Report"

### CDK

1. **Configure Report Delivery**:
   - Log in to CDK
   - Navigate to Reports > Report Scheduler
   - Set up the following reports to be emailed daily:
     - Inventory Report
     - Sales Report
     - Customer Report
   - Set the delivery format to CSV or Excel
   - Enter your configured email address as the recipient

2. **Email Subject Format**:
   The system looks for emails with subjects containing "CDK Report" or "Daily Report"

### Reynolds

1. **Configure Report Delivery**:
   - Log in to Reynolds
   - Navigate to Reports > Schedule Reports
   - Set up the following reports to be emailed daily:
     - Inventory Report
     - Sales Report
     - F&I Report
   - Set the delivery format to CSV or Excel
   - Enter your configured email address as the recipient

2. **Email Subject Format**:
   The system looks for emails with subjects containing "Reynolds Report" or "ERA Report"

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify email credentials are correct
   - For Gmail, ensure "Less secure app access" is enabled or use app passwords
   - Check for account lockouts or security alerts

2. **No Reports Found**:
   - Verify reports are being sent to the correct email account
   - Check spam/junk folders
   - Confirm search criteria matches the actual email format

3. **Connection Issues**:
   - Verify IMAP settings (host, port, TLS)
   - Check network connectivity
   - Ensure firewall allows IMAP connections

## FAQ

**Q: Can I use my personal email account?**  
A: Yes, but for production use, we recommend a dedicated email account for security and organization.

**Q: How often does the system check for new emails?**  
A: By default, the system checks for new emails every 15 minutes.

**Q: Can I use POP3 instead of IMAP?**  
A: No, the system requires IMAP to efficiently search and retrieve emails.

**Q: What happens if a report fails to process?**  
A: The system will retry processing failed reports automatically and alert administrators if persistent failures occur.

**Q: Can I have reports from multiple vendors sent to the same email?**  
A: Yes, the system can distinguish between different vendor reports based on email subject and content patterns.
