import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Menu, X, User, Shield, Building2, Droplets } from 'lucide-react';
import { useState } from 'react';

const roleIcons = {
  donor: Droplets,
  hospital: Building2,
  bloodbank: Heart,
  admin: Shield,
};

const roleLabels = {
  donor: 'Donor',
  hospital: 'Hospital',
  bloodbank: 'Blood Bank',
  admin: 'Admin',
};

const roleDashboard = {
  donor: '/donor',
  hospital: '/hospital',
  bloodbank: '/bloodbank',
  admin: '/admin',
};

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const RoleIcon = user ? roleIcons[user.role] || User : User;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Heart className="w-8 h-8 text-brand-500 transition-transform group-hover:scale-110" fill="currentColor" />
              <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-lg group-hover:bg-brand-500/40 transition-all" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              RedThread
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to={roleDashboard[user?.role] || '/'} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 hover:border-brand-500/30 transition-all">
                  <RoleIcon className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-medium text-dark-200">{user?.name}</span>
                  <span className="badge-info text-xs">{roleLabels[user?.role]}</span>
                </Link>
                {user?.status === 'pending' && (
                  <span className="badge-warning text-xs">Pending Approval</span>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-dark-400 hover:text-brand-400 hover:bg-dark-800 transition-all">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2 px-5">Login</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark-900/95 backdrop-blur-xl border-t border-dark-700/50 p-4 space-y-3 animate-slide-in">
          {isAuthenticated ? (
            <>
              <Link to={roleDashboard[user?.role] || '/'} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-dark-800 border border-dark-700">
                <RoleIcon className="w-5 h-5 text-brand-400" />
                <div>
                  <p className="font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-dark-400">{roleLabels[user?.role]}</p>
                </div>
              </Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-dark-400 hover:text-brand-400 hover:bg-dark-800 transition-all">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block w-full text-center btn-secondary py-2">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block w-full text-center btn-primary py-2">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
