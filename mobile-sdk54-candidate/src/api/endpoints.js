import apiClient from './client';

// --- Auth ---
export const register = ({ fullName, email, password, phoneNumber }) =>
  apiClient
    .post('/auth/register', {
      full_name: fullName,
      email,
      password,
      phone_number: phoneNumber || null,
    })
    .then((res) => res.data);

export const login = ({ email, password }) =>
  apiClient.post('/auth/login', { email, password }).then((res) => res.data);

export const getMe = () => apiClient.get('/auth/me').then((res) => res.data);

export const updateMe = (payload) => apiClient.patch('/auth/me', payload).then((res) => res.data);

// --- Incidents ---
export const getActiveIncidents = () => apiClient.get('/incidents/active').then((res) => res.data);

export const getIncidentById = (incidentId) =>
  apiClient.get(`/incidents/${incidentId}`).then((res) => res.data);

// --- Notifications (per-user alert history) ---
export const getMyNotifications = (userId) =>
  apiClient.get(`/notifications/user/${userId}`).then((res) => res.data);
