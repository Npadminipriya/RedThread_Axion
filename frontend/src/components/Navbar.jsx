import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Menu, X, User, Shield, Building2, Droplets, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';

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

const typeIcons = {
  request_alert: '🩸',
  approval: '✅',
  rejection: '❌',
  donation_confirm: '🎉',
  donation_complete: '✔️',
  expense_submitted: '📝',
  expense_approved: '💰',
  expense_rejected: '🚫',
  ivr_accepted: '📞',
  ivr_rejected: '📵',
  escalation: '⬆️',
  cooldown_started: '⏳',
  false_accept_flag: '⚠️',
  general: '📢',
};

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data } = await notificationAPI.getUnreadCount();
      setUnreadCount(data.unreadCount || 0);
    } catch (err) { /* silent */ }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await notificationAPI.getNotifications(1, 10);
      setNotifications(data.notifications || []);
    } catch (err) { /* silent */ }
  };

  const toggleNotif = () => {
    if (!showNotif) loadNotifications();
    setShowNotif(!showNotif);
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) { /* silent */ }
  };

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
                {user?.status === 'rejected' && (
                  <span className="badge-danger text-xs">Rejected</span>
                )}

                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button onClick={toggleNotif} className="relative p-2 rounded-xl text-dark-400 hover:text-brand-400 hover:bg-dark-800 transition-all">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotif && (
                    <div className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto glass-card rounded-2xl shadow-2xl border border-dark-600 z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
                        <h4 className="text-sm font-semibold text-white">Notifications</h4>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-dark-800">
                          {notifications.map(n => (
                            <div
                              key={n._id}
                              onClick={() => !n.isRead && markAsRead(n._id)}
                              className={`px-4 py-3 cursor-pointer transition-colors ${!n.isRead ? 'bg-brand-500/5 hover:bg-brand-500/10' : 'hover:bg-dark-800/50'}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-sm mt-0.5">{typeIcons[n.type] || '📢'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold ${!n.isRead ? 'text-white' : 'text-dark-300'}`}>{n.title}</p>
                                  <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-dark-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                                {!n.isRead && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-dark-500 text-xs py-8">No notifications</p>
                      )}
                    </div>
                  )}
                </div>

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
              <button onClick={() => { toggleNotif(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-dark-400 hover:text-brand-400 hover:bg-dark-800 transition-all">
                <Bell className="w-5 h-5" />
                Notifications
                {unreadCount > 0 && <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>}
              </button>
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
