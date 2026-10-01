/**
 * ============================================================================
 * Module: API Client (client.ts)
 * Description: 
 * Provides a globally configured Axios instance for all HTTP communications 
 * between the React Frontend and the FastAPI Backend. Ensures consistent 
 * headers and dynamic Base URL resolution via environment variables.
 * ============================================================================
 */

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});