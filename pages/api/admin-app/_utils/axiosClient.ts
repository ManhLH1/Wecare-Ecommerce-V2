import axios, { AxiosInstance } from "axios";
import http from "http";
import https from "https";
import { getAccessToken } from "../../getAccessToken";

// Optimized axios instance with connection pooling and timeout
const axiosClient: AxiosInstance = axios.create({
  timeout: 60000, // 60 seconds timeout (increased for complex operations)
  maxRedirects: 5,
  // Enable HTTP keep-alive for connection pooling
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
  }),
});

// Request interceptor to add auth token
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Failed to get access token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Retry logic for network errors or 5xx errors
    const config = error.config;
    
    if (!config || !config.retry) {
      config.retry = 0;
    }
    
    config.retryCount = config.retryCount || 0;
    const maxRetries = 2;
    
    if (
      config.retryCount < maxRetries &&
      (error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        (error.response && error.response.status >= 500))
    ) {
      config.retryCount += 1;
      
      // Exponential backoff: wait 1s, 2s
      const delay = Math.pow(2, config.retryCount - 1) * 1000;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      return axiosClient(config);
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;

