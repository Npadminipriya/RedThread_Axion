import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Heart, Mail, Lock, Phone, User, MapPin, FileText, Droplets, Building2, Database, ArrowRight, Eye, EyeOff, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'donor', bloodGroup: 'O+',
    address: '', latitude: '', longitude: '',
    licenseNumber: '',
  });
  const [document, setDocument] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (document) formData.append('document', document);

      const { data } = await authAPI.register(formData);
      login(data.user, data.token);
      toast.success(data.message);
      const routes = { admin: '/admin', hospital: '/hospital', bloodbank: '/bloodbank', donor: '/donor' };
      navigate(routes[data.user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    { value: 'donor', icon: Droplets, label: 'Donor', desc: 'Donate blood & earn rewards' },
    { value: 'hospital', icon: Building2, label: 'Hospital', desc: 'Request blood for patients' },
    { value: 'bloodbank', icon: Database, label: 'Blood Bank', desc: 'Manage blood inventory' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="w-10 h-10 text-brand-500" fill="currentColor" />
          <span className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            RedThread
          </span>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Create Account</h2>
          <p className="text-dark-400 text-center mb-6 text-sm">Join the life-saving network</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">I am a</label>
              <div className="grid grid-cols-3 gap-3">
                {roleCards.map(r => (
                  <button type="button" key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                    className={`p-3 rounded-xl border text-center transition-all
                      ${form.role === r.value
                        ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'}`}>
                    <r.icon className={`w-6 h-6 mx-auto mb-1 ${form.role === r.value ? 'text-brand-400' : 'text-dark-500'}`} />
                    <p className={`text-xs font-semibold ${form.role === r.value ? 'text-brand-400' : 'text-dark-400'}`}>{r.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    className="input-field pl-10" placeholder="John Doe" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="input-field pl-10" placeholder="you@email.com" required />
                </div>
              </div>
            </div>

            {/* Phone & Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    className="input-field pl-10" placeholder="+1234567890" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    className="input-field pl-10 pr-10" placeholder="••••••" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Donor: Blood Group */}
            {form.role === 'donor' && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {bloodGroups.map(bg => (
                    <button type="button" key={bg} onClick={() => setForm({ ...form, bloodGroup: bg })}
                      className={`py-2 rounded-lg text-sm font-bold transition-all
                        ${form.bloodGroup === bg
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50 shadow-lg shadow-brand-500/10'
                          : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600'}`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-dark-500" />
                <input type="text" name="address" value={form.address} onChange={handleChange}
                  className="input-field pl-10" placeholder="Your address" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input type="number" name="latitude" value={form.latitude} onChange={handleChange}
                  className="input-field text-sm" placeholder="Latitude" step="any" />
                <input type="number" name="longitude" value={form.longitude} onChange={handleChange}
                  className="input-field text-sm" placeholder="Longitude" step="any" />
              </div>
            </div>

            {/* Hospital/BloodBank: License */}
            {(form.role === 'hospital' || form.role === 'bloodbank') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">License Number</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input type="text" name="licenseNumber" value={form.licenseNumber} onChange={handleChange}
                      className="input-field pl-10" placeholder="License number" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">License Document</label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-dark-600 hover:border-brand-500/50 cursor-pointer transition-all bg-dark-900/50">
                    <Upload className="w-5 h-5 text-dark-500" />
                    <span className="text-sm text-dark-400">
                      {document ? document.name : 'Upload license (PDF, JPG, PNG)'}
                    </span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocument(e.target.files[0])}
                      className="hidden" />
                  </label>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-xs text-amber-400">⚠️ Hospital and Blood Bank accounts require admin verification before access is granted.</p>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
