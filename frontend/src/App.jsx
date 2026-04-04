import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import BloodBankDashboard from './pages/BloodBankDashboard';
import AdminDashboard from './pages/AdminDashboard';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={
          isAuthenticated ? (
            <Navigate to={
              user?.role === 'admin' ? '/admin' :
              user?.role === 'hospital' ? '/hospital' :
              user?.role === 'bloodbank' ? '/bloodbank' :
              '/donor'
            } replace />
          ) : <Landing />
        } />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/donor" element={
          <ProtectedRoute roles={['donor']}>
            <DonorDashboard />
          </ProtectedRoute>
        } />
        <Route path="/hospital" element={
          <ProtectedRoute roles={['hospital']}>
            <HospitalDashboard />
          </ProtectedRoute>
        } />
        <Route path="/bloodbank" element={
          <ProtectedRoute roles={['bloodbank']}>
            <BloodBankDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
