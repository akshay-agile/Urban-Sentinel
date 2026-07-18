import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '../config';

export const TOKEN_KEY = 'urban_sentinel_access_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach the stored JWT to every request automatically, so screens never
// have to think about auth headers.
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
