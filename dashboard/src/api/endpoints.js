import apiClient from './client';

export const getDevices = () => apiClient.get('/devices/').then((res) => res.data);

export const getAllIncidents = () => apiClient.get('/incidents/').then((res) => res.data);

export const getActiveIncidents = () => apiClient.get('/incidents/active').then((res) => res.data);

export const resolveIncident = (id) =>
  apiClient.patch(`/incidents/${id}`, { status: 'resolved' }).then((res) => res.data);

export const getRecentReadingsForDevice = (devicePk, limit = 20) =>
  apiClient.get(`/sensor-readings/device/${devicePk}`, { params: { limit } }).then((res) => res.data);
