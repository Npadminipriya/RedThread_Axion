import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Droplets, Building2, Database, Shield, ArrowRight, Zap, Phone, Link2 } from 'lucide-react';

export default function Landing() {
  const { isAuthenticated, user } = useAuth();

  const features = [
    { icon: Zap, title: 'AI Smart Matching', desc: 'Intelligent algorithm matches donors based on blood group, location, and availability', color: 'from-sky-500 to-blue-600' },
    { icon: Phone, title: 'Twilio Integration', desc: 'Automated voice calls and SMS notifications to donors and blood banks', color: 'from-emerald-500 to-teal-600' },
    { icon: Link2, title: 'Blockchain Verified', desc: 'Every donation is recorded with a blockchain-verified hash for transparency', color: 'from-violet-500 to-purple-600' },
    { icon: Shield, title: 'Admin Verification', desc: 'Hospitals and blood banks are verified by admins before accessing the platform', color: 'from-amber-500 to-orange-600' },
  ];

  const roles = [
    { icon: Droplets, title: 'Donor', desc: 'Donate blood, earn coins & badges, track your impact', link: '/register', color: 'brand' },
    { icon: Building2, title: 'Hospital', desc: 'Create blood requests, find donors instantly', link: '/register', color: 'sky' },
    { icon: Database, title: 'Blood Bank', desc: 'Manage inventory, respond to emergency requests', link: '/register', color: 'emerald' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 animate-slide-in">
            <div className="relative">
              <Heart className="w-16 h-16 text-brand-500 animate-float" fill="currentColor" />
              <div className="absolute inset-0 bg-brand-500/30 rounded-full blur-2xl animate-glow" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 animate-slide-in-delay-1">
            <span className="bg-gradient-to-r from-white via-dark-100 to-dark-300 bg-clip-text text-transparent">
              Red
            </span>
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Thread
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-dark-400 max-w-3xl mx-auto mb-4 font-light animate-slide-in-delay-2">
            Intelligent Blood Donation Platform
          </p>
          <p className="text-base text-dark-500 max-w-2xl mx-auto mb-10 animate-slide-in-delay-3">
            Connecting donors, hospitals, and blood banks with AI-powered matching,
            real-time Twilio notifications, and blockchain-verified records.
          </p>

          <div className="flex items-center justify-center gap-4 animate-slide-in-delay-4">
            {isAuthenticated ? (
              <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'hospital' ? '/hospital' : user?.role === 'bloodbank' ? '/bloodbank' : '/donor'}
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-8 py-4">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-white to-dark-400 bg-clip-text text-transparent">
              Powered by Innovation
            </span>
          </h2>
          <p className="text-dark-500 text-center mb-12 max-w-xl mx-auto">
            Every feature designed to save lives faster and smarter
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass-card-hover p-6 group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4
                  transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-dark-950/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-white to-dark-400 bg-clip-text text-transparent">
              Join as
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((r, i) => (
              <Link to={r.link} key={i} className="glass-card-hover p-8 text-center group">
                <div className="w-20 h-20 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center mx-auto mb-6
                  group-hover:border-brand-500/50 transition-all group-hover:scale-110">
                  <r.icon className="w-10 h-10 text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{r.title}</h3>
                <p className="text-dark-400 mb-6">{r.desc}</p>
                <span className="inline-flex items-center gap-2 text-brand-400 font-semibold text-sm group-hover:gap-3 transition-all">
                  Register Now <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-brand-500" fill="currentColor" />
            <span className="text-sm text-dark-500">RedThread © 2024</span>
          </div>
          <p className="text-sm text-dark-600">Every drop counts 🩸</p>
        </div>
      </footer>
    </div>
  );
}
