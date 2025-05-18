// Main entry point for the AI Agent API server
import dotenv from 'dotenv';
import { startServer } from '@/api/server';

// Load environment variables
dotenv.config();

// Start the server
startServer().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
