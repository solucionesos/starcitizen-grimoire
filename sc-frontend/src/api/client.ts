import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

import type { Ship, VehicleWeapon, Resource, Mission } from '../types';

export const getMissions = (): Promise<Mission[]> => api.get('/missions').then(res => res.data);
export const getBlueprints = () => api.get('/blueprints').then(res => res.data);
export const getResources = (): Promise<Resource[]> => api.get('/resources').then(res => res.data);
export const getChronicles = () => api.get('/chronicles').then(res => res.data);
export const getShips = (): Promise<Ship[]> => api.get('/ships').then(res => res.data);
export const getWeapons = (): Promise<VehicleWeapon[]> => api.get('/weapons').then(res => res.data);
