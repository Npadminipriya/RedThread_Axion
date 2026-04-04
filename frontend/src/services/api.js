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
  verifyUser: (id, status, rejectionReason) => API.put(`/admin/verify/${id}`, { status, rejectionReason }),
  getStats: () => API.get('/admin/stats'),
  getDocument: (id) => API.get(`/admin/document/${id}`),
  getExpenses: (status) => API.get(`/admin/expenses${status ? `?status=${status}` : ''}`),
  processExpense: (id, status, adminNote) => API.put(`/admin/expense/${id}`, { status, adminNote }),
  getEmergencyStats: () => API.get('/admin/emergency-stats'),
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
  getTrustScore: () => API.get('/donor/trust-score'),
};

// Hospital APIs
export const hospitalAPI = {
  createRequest: (data) => API.post('/hospital/request', data),
  getRequests: () => API.get('/hospital/requests'),
  getRequest: (id) => API.get(`/hospital/request/${id}`),
  escalateRequest: (id) => API.post(`/hospital/escalate/${id}`),
  fulfillRequest: (id) => API.put(`/hospital/request/${id}/fulfill`),
  confirmDonation: (id, donorId, donorShowedUp, notes) => API.put(`/hospital/request/${id}/confirm-donation`, { donorId, donorShowedUp, notes }),
  getAvailableDonors: (params) => API.get('/hospital/available-donors', { params }),
};

// Blood Bank APIs
export const bloodBankAPI = {
  getProfile: () => API.get('/bloodbank/profile'),
  getInventory: () => API.get('/bloodbank/inventory'),
  updateInventory: (inventory) => API.put('/bloodbank/inventory', { inventory }),
  getRequests: () => API.get('/bloodbank/requests'),
  respondToRequest: (requestId, response, units) => API.post(`/bloodbank/respond/${requestId}`, { response, units }),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (page = 1, limit = 20) => API.get(`/notifications?page=${page}&limit=${limit}`),
  getUnreadCount: () => API.get('/notifications/unread-count'),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put('/notifications/read-all'),
};

// Expense APIs
export const expenseAPI = {
  submit: (formData) => API.post('/expense/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyExpenses: () => API.get('/expense/my-expenses'),
  getWallet: () => API.get('/expense/wallet'),
};

// Search APIs
export const searchAPI = {
  nearbyBloodBanks: (lat, lng, radius) => API.get('/search/nearby-bloodbanks', { params: { lat, lng, radius } }),
  nearbyHospitals: (lat, lng, radius) => API.get('/search/nearby-hospitals', { params: { lat, lng, radius } }),
  nearbyDonors: (lat, lng, bloodGroup, radius) => API.get('/search/nearby-donors', { params: { lat, lng, bloodGroup, radius } }),
};

export default API;
