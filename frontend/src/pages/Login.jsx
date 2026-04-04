import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Heart, Mail, Lock, Eye, EyeOff, Phone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' or 'otp'
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email: form.email, password: form.password });
      login(data.user, data.token);
      toast.success('Login successful!');
      const routes = { admin: '/admin', hospital: '/hospital', bloodbank: '/bloodbank', donor: '/donor' };
      navigate(routes[data.user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!form.phone) return toast.error('Enter phone number');
    setLoading(true);
    try {
      const { data } = await authAPI.sendOTP(form.phone);
      setOtpSent(true);
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
        toast.success(`Demo OTP: ${data.demoOtp}`);
      } else {
        toast.success('OTP sent to your phone');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(form.phone, form.otp);
      login(data.user, data.token);
      toast.success('Login successful!');
      const routes = { admin: '/admin', hospital: '/hospital', bloodbank: '/bloodbank', donor: '/donor' };
      navigate(routes[data.user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="w-10 h-10 text-brand-500" fill="currentColor" />
          <span className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            RedThread
          </span>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h2>
          <p className="text-dark-400 text-center mb-6 text-sm">Sign in to continue saving lives</p>

          {/* Mode Toggle */}
          <div className="flex bg-dark-900 rounded-xl p-1 mb-6">
            <button onClick={() => { setMode('password'); setOtpSent(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'password' ? 'bg-brand-600 text-white shadow-lg' : 'text-dark-400 hover:text-white'}`}>
              Password
            </button>
            <button onClick={() => setMode('otp')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'otp' ? 'bg-brand-600 text-white shadow-lg' : 'text-dark-400 hover:text-white'}`}>
              OTP Login
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="input-field pl-10" placeholder="you@email.com" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    className="input-field pl-10 pr-10" placeholder="••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    className="input-field pl-10" placeholder="+1234567890" required />
                </div>
              </div>
              {!otpSent ? (
                <button type="button" onClick={handleSendOTP} disabled={loading} className="btn-primary w-full">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Enter OTP</label>
                    <input type="text" name="otp" value={form.otp} onChange={handleChange}
                      className="input-field text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000" maxLength={6} required />
                    {demoOtp && <p className="text-xs text-amber-400 mt-1">Demo OTP: {demoOtp}</p>}
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Verify & Login <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <button type="button" onClick={handleSendOTP} className="w-full text-sm text-dark-500 hover:text-brand-400 transition-colors">
                    Resend OTP
                  </button>
                </>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Demo creds */}
        <div className="mt-4 glass-card p-4">
          <p className="text-xs text-dark-500 text-center mb-2 font-medium">Demo Admin Login</p>
          <p className="text-xs text-dark-400 text-center font-mono">admin@redthread.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
