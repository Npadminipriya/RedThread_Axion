import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('redthread_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('redthread_token');
      localStorage.removeItem('redthread_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (formData) => API.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  login: (data) => API.post('/auth/login', data),
  sendOTP: (phone) => API.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => API.post('/auth/verify-otp', { phone, otp }),
  getMe: () => API.get('/auth/me'),
};

// Admin APIs
export const adminAPI = {
  getPending: () => API.get('/admin/pending'),
  getAllUsers: () => API.get('/admin/all-users'),
  verifyUser: (id, status) => API.put(`/admin/verify/${id}`, { status }),
  getStats: () => API.get('/admin/stats'),
};

// Donor APIs
export const donorAPI = {
  getProfile: () => API.get('/donor/profile'),
  updateProfile: (data) => API.put('/donor/profile', data),
  toggleAvailability: (availability) => API.put('/donor/availability', { availability }),
  getHistory: () => API.get('/donor/history'),
  getCoins: () => API.get('/donor/coins'),
  getRequests: () => API.get('/donor/requests'),
  respondToRequest: (requestId, response) => API.post(`/donor/respond/${requestId}`, { response }),
  getLeaderboard: () => API.get('/donor/leaderboard'),
};

// Hospital APIs
export const hospitalAPI = {
  createRequest: (data) => API.post('/hospital/request', data),
  getRequests: () => API.get('/hospital/requests'),
  getRequest: (id) => API.get(`/hospital/request/${id}`),
  escalateRequest: (id) => API.post(`/hospital/escalate/${id}`),
  fulfillRequest: (id) => API.put(`/hospital/request/${id}/fulfill`),
};

// Blood Bank APIs
export const bloodBankAPI = {
  getProfile: () => API.get('/bloodbank/profile'),
  getInventory: () => API.get('/bloodbank/inventory'),
  updateInventory: (inventory) => API.put('/bloodbank/inventory', { inventory }),
  getRequests: () => API.get('/bloodbank/requests'),
  respondToRequest: (requestId, response, units) => API.post(`/bloodbank/respond/${requestId}`, { response, units }),
};

export default API;
