import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Heart, Mail, Lock, Phone, User, MapPin, FileText, Droplets, Building2, Database, ArrowRight, Eye, EyeOff, Upload, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'donor', bloodGroup: 'O+',
    address: '', latitude: '', longitude: '',
    licenseNumber: '',
  });
  const [document, setDocument] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success('Location detected!');
        setErrors(prev => ({ ...prev, latitude: null, longitude: null }));
      },
      (err) => {
        setLocating(false);
        toast.error('Could not detect location. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!form.password || form.password.length < 6) errs.password = 'Min 6 characters';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.latitude && !form.longitude) errs.latitude = 'Use "My Location" or enter coordinates';
    if (form.role === 'donor' && !form.bloodGroup) errs.bloodGroup = 'Select blood group';
    if ((form.role === 'hospital' || form.role === 'bloodbank')) {
      if (!form.licenseNumber.trim()) errs.licenseNumber = 'License number required';
      if (!document) errs.document = 'License document required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill all required fields');
      return;
    }
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
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      // Parse server errors
      if (err.response?.data?.errors) {
        const serverErrs = {};
        err.response.data.errors.forEach(e => {
          if (e.toLowerCase().includes('name')) serverErrs.name = e;
          else if (e.toLowerCase().includes('email')) serverErrs.email = e;
          else if (e.toLowerCase().includes('phone')) serverErrs.phone = e;
          else if (e.toLowerCase().includes('password')) serverErrs.password = e;
        });
        setErrors(prev => ({ ...prev, ...serverErrs }));
      }
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    { value: 'donor', icon: Droplets, label: 'Donor', desc: 'Donate blood & earn rewards' },
    { value: 'hospital', icon: Building2, label: 'Hospital', desc: 'Request blood for patients' },
    { value: 'bloodbank', icon: Database, label: 'Blood Bank', desc: 'Manage blood inventory' },
  ];

  const FieldError = ({ field }) => errors[field] ? <p className="text-red-400 text-xs mt-1">{errors[field]}</p> : null;

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
              <label className="block text-sm font-medium text-dark-300 mb-2">I am a <span className="text-brand-400">*</span></label>
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
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name <span className="text-brand-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`} placeholder="John Doe" required />
                </div>
                <FieldError field="name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Email <span className="text-brand-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`} placeholder="you@email.com" required />
                </div>
                <FieldError field="email" />
              </div>
            </div>

            {/* Phone & Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone <span className="text-brand-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`} placeholder="+1234567890" required />
                </div>
                <FieldError field="phone" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Password <span className="text-brand-400">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`} placeholder="••••••" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError field="password" />
              </div>
            </div>

            {/* Donor: Blood Group */}
            {form.role === 'donor' && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Blood Group <span className="text-brand-400">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {bloodGroups.map(bg => (
                    <button type="button" key={bg} onClick={() => { setForm({ ...form, bloodGroup: bg }); setErrors({ ...errors, bloodGroup: null }); }}
                      className={`py-2 rounded-lg text-sm font-bold transition-all
                        ${form.bloodGroup === bg
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50 shadow-lg shadow-brand-500/10'
                          : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600'}`}>
                      {bg}
                    </button>
                  ))}
                </div>
                <FieldError field="bloodGroup" />
              </div>
            )}

            {/* Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-dark-300">Address <span className="text-brand-400">*</span></label>
                <button type="button" onClick={getLocation} disabled={locating}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  <Navigation className="w-3 h-3" />
                  {locating ? 'Detecting...' : '📍 Use My Location'}
                </button>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-dark-500" />
                <input type="text" name="address" value={form.address} onChange={handleChange}
                  className={`input-field pl-10 ${errors.address ? 'border-red-500' : ''}`} placeholder="Your address" required />
              </div>
              <FieldError field="address" />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input type="number" name="latitude" value={form.latitude} onChange={handleChange}
                  className={`input-field text-sm ${errors.latitude ? 'border-red-500' : ''}`} placeholder="Latitude" step="any" required />
                <input type="number" name="longitude" value={form.longitude} onChange={handleChange}
                  className={`input-field text-sm ${errors.longitude ? 'border-red-500' : ''}`} placeholder="Longitude" step="any" required />
              </div>
              <FieldError field="latitude" />
            </div>

            {/* Hospital/BloodBank: License */}
            {(form.role === 'hospital' || form.role === 'bloodbank') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">License Number <span className="text-brand-400">*</span></label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input type="text" name="licenseNumber" value={form.licenseNumber} onChange={handleChange}
                      className={`input-field pl-10 ${errors.licenseNumber ? 'border-red-500' : ''}`} placeholder="License number" required />
                  </div>
                  <FieldError field="licenseNumber" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">License Document <span className="text-brand-400">*</span></label>
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all bg-dark-900/50
                    ${errors.document ? 'border-red-500/50 hover:border-red-400/50' : 'border-dark-600 hover:border-brand-500/50'}`}>
                    <Upload className="w-5 h-5 text-dark-500" />
                    <span className="text-sm text-dark-400">
                      {document ? document.name : 'Upload license (PDF, JPG, PNG)'}
                    </span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { setDocument(e.target.files[0]); setErrors({ ...errors, document: null }); }}
                      className="hidden" />
                  </label>
                  <FieldError field="document" />
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
