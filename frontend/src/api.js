import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Students API
export const getStudents = () => api.get('/students');
export const registerStudent = (data) => api.post('/students', data);

// Events API (Use Case 1 & 5)
export const getEvents = () => api.get('/events');
export const createEvent = (data) => api.post('/events', data);
export const getEventSummary = () => api.get('/events/summary');

// Registration API (Use Case 2, 3, 4)
export const registerForEvent = (data) => api.post('/registrations', data);
export const getStudentPasses = (studId) => api.get(`/registrations/student/${studId}`);
export const cancelRegistration = (regId) => api.delete(`/registrations/${regId}`);
export const checkInToEvent = (regId) => api.post('/registrations/check-in', { RegId: regId });

export default api;
