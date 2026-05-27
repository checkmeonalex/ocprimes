import { fetchConnector } from '@/utils/connector.mjs';

// Wrapper function for API calls to the connector
export const apiFetch = async (path, options = {}) => {
  // Add authorization header if token exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('agentic_access_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetchConnector(path, {
    ...options,
    headers,
  });

  return response;
};
