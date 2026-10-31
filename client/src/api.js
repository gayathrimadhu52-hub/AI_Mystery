import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', timeout: 90000 });
export const messageFor = (error) => error?.response?.data?.error?.message || (error?.code === 'ECONNABORTED' ? 'The request took too long. Check your connection and try again.' : 'We could not reach the case desk. Check your connection and try again.');
export const createCase = (payload) => api.post('/cases', payload).then((r) => r.data.data.case);
export const getCase = (id) => api.get(`/cases/${id}`).then((r) => r.data.data.case);
export const discoverClue = (id, clueId) => api.post(`/cases/${id}/clues/${clueId}/discover`).then((r) => r.data.data);
export const getHint = (id) => api.post(`/cases/${id}/hints`).then((r) => r.data.data);
export const accuse = (id, suspectId) => api.post(`/cases/${id}/accuse`, { suspectId }).then((r) => r.data.data.result);
export const getResult = (id) => api.get(`/cases/${id}/result`).then((r) => r.data.data.result);
