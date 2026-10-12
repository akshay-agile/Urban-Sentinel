import apiClient from './client';

export const getDevices = () => apiClient.get('/devices/').then((res) => res.data);

export const getAllIncidents = () => apiClient.get('/incidents/').then((res) => res.data);

export const getActiveIncidents = () => apiClient.get('/incidents/active').then((res) => res.data);

export const resolveIncident = (id) =>
  apiClient.patch(`/incidents/${id}`, { status: 'resolved' }).then((res) => res.data);

export const getRecentReadingsForDevice = (devicePk, limit = 20) =>
  apiClient.get(`/sensor-readings/device/${devicePk}`, { params: { limit } }).then((res) => res.data);

export const createDevice = (payload) => apiClient.post('/devices/', payload).then((res) => res.data);
export const updateDevice = (id, payload) => apiClient.patch(`/devices/${id}`, payload).then((res) => res.data);
export const getNotifications = () => apiClient.get('/notifications/mine').then((res) => res.data);
export const getMyProfile = () => apiClient.get('/auth/me').then((res) => res.data);
export const getResponders = () => apiClient.get('/responders/').then((res) => res.data);
export const createResponder = (payload) => apiClient.post('/responders/', payload).then((res) => res.data);
export const updateResponder = (id, payload) => apiClient.patch(`/responders/${id}`, payload).then((res) => res.data);
