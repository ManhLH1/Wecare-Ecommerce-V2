import * as msal from "@azure/msal-node";
import dotenv from "dotenv";
import { LRUCache } from "lru-cache";

dotenv.config();

const client_id = "6fba5a54-1729-4c41-b444-8992ae22c909";
const client_secret = "Lfd8Q~LwEJlIy9j~UCdDoK4I7sus4_mswLLK_cAQ";
const tenant_id = "08dd70ab-ac3b-4a33-acd1-ef3fe1729e61";

if (!client_id || !client_secret || !tenant_id) {
  throw new Error(
    "Missing environment variables: CLIENT_ID, CLIENT_SECRET, TENANT_ID must be set"
  );
}

const authority = `https://login.microsoftonline.com/${tenant_id}`;
const scope = ["https://wecare-ii.crm5.dynamics.com/.default"];

// Initialize MSAL application
const app = new msal.ConfidentialClientApplication({
  auth: {
    clientId: client_id,
    authority: authority,
    clientSecret: client_secret,
  },
});

// Initialize token cache with 55 minute TTL
const tokenCache = new LRUCache<string, string>({
  max: 1,
  ttl: 3300000, // 55 minutes
});

// Helper function to validate token
const isTokenValid = (token: string): boolean => {
  try {
    return token.length > 0 && token !== 'undefined' && token !== 'null';
  } catch {
    return false;
  }
};

// Helper function to handle token refresh with retries
const refreshTokenWithRetry = async (retries = 3, delay = 1000): Promise<string> => {
  for (let i = 0; i < retries; i++) {
    try {
      const tokenResponse = await app.acquireTokenByClientCredential({
        scopes: scope,
      });

      if (tokenResponse?.accessToken) {
        return tokenResponse.accessToken;
      }
      throw new Error("No access token in response");
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to refresh token after retries");
};

export async function getAccessToken(): Promise<string> {
  try {
    // Try to get token from cache first
    let token = tokenCache.get('accessToken');
    
    // If no token in cache or token is invalid, get a new one
    if (!token || !isTokenValid(token)) {
      token = await refreshTokenWithRetry();
      if (isTokenValid(token)) {
        tokenCache.set('accessToken', token);
      } else {
        throw new Error("Failed to obtain valid token");
      }
    }
    
    return token;
  } catch (error) {
    // Clear cache on error
    tokenCache.delete('accessToken');
    throw error;
  }
}
