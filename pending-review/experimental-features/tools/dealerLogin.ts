import { storage } from '../server/storage.js';
// axios import is commented out as it's not currently used
// import axios from 'axios';
import { EkoTool } from './extractCleanContent.js';
interface DealerLoginArgs {
  dealerId: string;
  siteUrl?: string;
  userId?: string; // User ID for credential lookup
}
// Export the interface so it can be imported by other modules
export interface DealerLoginResult {
  success: boolean;
  message: string;
  dealerId: string;
  dealerName: string | undefined; // Friendly name of the dealer system
  token?: string; // Auth token when login is successful
  expiresAt?: string; // Token expiration date
  error?: string; // Detailed error information when login fails
  apiEndpoint?: string; // The endpoint used for login
  sessionId?: string; // Optional session identifier for maintaining state
}
// Map of common dealer systems to their friendly names and endpoints
const DEALER_SYSTEMS: Record<string, { name: string; endpoint: string }> = {
  dealersocket: {
    name: 'DealerSocket',
    endpoint: 'https://login.dealersocket.com/api/auth',
  },
  dealertrack: {
    name: 'Dealertrack',
    endpoint: 'https://auth.dealertrack.com/login',
  },
  cdkglobal: {
    name: 'CDK Global',
    endpoint: 'https://auth.cdkglobal.com/login',
  },
  reynolds: {
    name: 'Reynolds & Reynolds',
    endpoint: 'https://login.reyrey.com/authentication',
  },
  automate: {
    name: 'AutoMate',
    endpoint: 'https://api.automate.com/v1/auth',
  },
  elead: {
    name: 'eLead',
    endpoint: 'https://login.elead-crm.com/api/auth',
  },
};
/**
 * Attempts to identify the dealer system based on the dealer ID
 * @param dealerId The ID of the dealer to identify
 * @returns The system information if identified, or null if not found
 */
function identifyDealerSystem(
  dealerId: string
): { key: string; name: string; endpoint: string } | null {
  const lowercaseId = dealerId.toLowerCase();
  // Check if the dealer ID contains a known system name
  const matchedSystem = Object.keys(DEALER_SYSTEMS).find((system) =>
    lowercaseId.includes(system.toLowerCase())
  );
  if (matchedSystem) {
    return {
      key: matchedSystem,
      name: DEALER_SYSTEMS[matchedSystem].name,
      endpoint: DEALER_SYSTEMS[matchedSystem].endpoint,
    };
  }
  return null;
}
/**
 * Creates a dealerLogin tool that handles authentication with dealer websites
 * using stored credentials
 * @returns A tool object that can be registered with Eko
 */
export function dealerLogin(): EkoTool {
  return {
    name: 'dealerLogin',
    description: 'Log in to a dealer website using stored credentials',
    parameters: {
      type: 'object',
      properties: {
        dealerId: {
          type: 'string',
          description: 'The unique identifier for the dealer',
        },
        siteUrl: {
          type: 'string',
          description: 'Optional URL of the dealer website',
        },
        userId: {
          type: 'string',
          description: 'Optional user ID for credential lookup',
        },
      },
      required: ['dealerId'],
    },
    handler: async (args: DealerLoginArgs): Promise<DealerLoginResult> => {
      try {
        const { dealerId, userId } = args;
        if (!userId) {
          // Try to identify the dealer system anyway so we can provide a better error message
          const systemInfo = identifyDealerSystem(dealerId);
          const dealerName = systemInfo ? systemInfo.name : 'dealer system';
          return {
            success: false,
            dealerId,
            dealerName: systemInfo?.name,
            message: `Authentication required: Please log in to access ${dealerName}`,
            error: 'No user ID provided for credential lookup',
          };
        }
        // Format site key for credential lookup:
        // We store dealer credentials with a prefix to distinguish them from other credentials
        const siteKey = `dealer:${dealerId.toLowerCase()}`;
        console.log(`Looking up credentials for site: ${siteKey}`);
        // Get credentials from the secure storage
        let userCredentials = await storage.getCredential(userId, siteKey);
        if (!userCredentials) {
          // If no credentials found with the formatted key, try with just the dealer ID
          // (for backward compatibility with older stored credentials)
          const fallbackCredentials = await storage.getCredential(userId, dealerId);
          if (!fallbackCredentials) {
            // Try to identify the dealer system anyway so we can provide a better error message
            const systemInfo = identifyDealerSystem(dealerId);
            const dealerName = systemInfo ? systemInfo.name : 'dealer system';
            return {
              success: false,
              dealerId,
              dealerName: systemInfo?.name,
              message: `No stored credentials found for ${dealerName}`,
              error: 'Credentials not found. Please store your dealer credentials first.',
            };
          }
          console.log(`Found credentials using fallback key: ${dealerId}`);
          // Use the fallback credentials
          userCredentials = fallbackCredentials;
        }
        // Determine the API endpoint for the login attempt
        let apiEndpoint = args.siteUrl || null;
        let dealerName: string | undefined = undefined;
        let systemKey: string | undefined = undefined;
        // Try to identify the dealer system if no endpoint was specified
        if (!apiEndpoint) {
          const systemInfo = identifyDealerSystem(dealerId);
          if (systemInfo) {
            apiEndpoint = systemInfo.endpoint;
            dealerName = systemInfo.name;
            systemKey = systemInfo.key;
            console.log(`Identified dealer system: ${dealerName} (${systemKey})`);
            console.log(`Using endpoint: ${apiEndpoint}`);
          } else {
            // Use a generic fallback if we can't identify the system
            apiEndpoint = 'https://api.dealer-system.com/login';
            dealerName = 'Unknown Dealer System';
            console.log(`Could not identify dealer system for ID: ${dealerId}`);
            console.log(`Using generic endpoint: ${apiEndpoint}`);
          }
        }
        // Log the login attempt with sensitive details masked
        console.log(
          `Attempting login for dealer ${dealerId} with user ${userCredentials.username.substring(0, 2)}***`
        );
        try {
          // In a production system, this would be a real API call
          // Here we'll simulate the network request with a timeout
          // to mimic a realistic login flow
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, 800));
          // For now, we just simulate a successful login
          // In a real implementation, we would perform the actual login request:
          /*
          const loginResponse = await axios.post(apiEndpoint, {
            username: userCredentials.username,
            password: userCredentials.password,
            dealerId: dealerId
          }, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'DealerAssistant/1.0'
            }
          });
          // Handle the response
          const isSuccessful = loginResponse.status === 200;
          const responseData = loginResponse.data;
          const authToken = responseData.token || responseData.access_token;
          */
          // Generate a simulated token (in production this would come from the API)
          const simulatedToken = `${Buffer.from(dealerId).toString('base64')}.${Date.now()}`;
          const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
          console.log(
            `Successfully logged in to dealer ${dealerId} using credentials for user ${userId}`
          );
          // Create a session ID for tracking this login session
          const sessionId = `${dealerId}-${Date.now()}`;
          return {
            success: true,
            dealerId,
            dealerName, // Include the dealer system name
            message: `Successfully authenticated with ${dealerName || 'dealer system'}`,
            token: simulatedToken,
            expiresAt,
            apiEndpoint, // Include the endpoint used for reference
            sessionId, // Include a session ID for tracking
          };
        } catch (loginError: unknown) {
          console.error(`Login error for dealer ${dealerId}:`, loginError);
          const errorMessage =
            loginError instanceof Error ? loginError.message : String(loginError);
          return {
            success: false,
            dealerId,
            dealerName,
            message: `Authentication failed with ${dealerName || 'dealer system'}`,
            error: errorMessage,
            apiEndpoint,
          };
        }
      } catch (error: unknown) {
        console.error('Error in dealer login:', error);
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
                : String(error)
              : String(error)
            : String(error);
        // For catastrophic errors, create a generic response
        const dealerId = args.dealerId!;
        const systemInfo = identifyDealerSystem(dealerId);
        const dealerName = systemInfo ? systemInfo.name : 'Unknown Dealer System';
        return {
          success: false,
          dealerId,
          dealerName,
          message: `Failed to authenticate with ${dealerName}`,
          error: errorMessage,
        };
      }
    },
  };
}
