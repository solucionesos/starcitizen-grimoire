import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const getMissions = () => api.get('/missions').then(res => res.data);
export const getBlueprints = () => api.get('/blueprints').then(res => res.data);
export const getResources = () => api.get('/resources').then(res => res.data);
export const getChronicles = () => api.get('/chronicles').then(res => res.data);
