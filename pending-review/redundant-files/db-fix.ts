/**
 * Fixed database connection module
 * Using direct connection to Supabase
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Parse DATABASE_URL if available, otherwise use the explicit Supabase URL
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:[YOUR-PASSWORD]@db.cliddlnoxqnkcwjumeil.supabase.co:5432/postgres';
// Replace [YOUR-PASSWORD] with the actual password if it's still in the string
const cleanedUrl = databaseUrl.includes('[YOUR-PASSWORD]')
  ? databaseUrl.replace('[YOUR-PASSWORD]', 'YOUR_ACTUAL_PASSWORD_HERE')
  : databaseUrl;
console.log('Connecting to database with fixed connection settings');
// Configure the postgres client with better timeout settings
const client = postgres(cleanedUrl, {
  ssl: { rejectUnauthorized: false },
  idle_timeout: 30,
  connect_timeout: 30,
  max_lifetime: 60 * 5, // 5 minutes
});
// Export the drizzle database client
export const db = drizzle(client);
// Export the raw postgres client for direct queries if needed
export const pgClient = client;
// Simple test function
export async function testConnection() {
  try {
    const result = await client`SELECT 1 as ok`;
    console.log('Database connection test successful:', result);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
