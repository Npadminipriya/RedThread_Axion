import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Shield, Users, Building2, Database, Clock, CheckCircle, XCircle, AlertTriangle, Heart, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, pendingRes, usersRes] = await Promise.all([
        adminAPI.getStats().catch(() => ({ data: { stats: {} } })),
        adminAPI.getPending().catch(() => ({ data: { pendingRequests: [] } })),
        adminAPI.getAllUsers().catch(() => ({ data: { users: [] } })),
      ]);
      setStats(statsRes?.data?.stats || {});
      setPendingRequests(pendingRes?.data?.pendingRequests || []);
      setAllUsers(usersRes?.data?.users || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const verifyUser = async (id, status) => {
    try {
      await adminAPI.verifyUser(id, status);
      toast.success(`User ${status} successfully`);
      loadData();
    } catch (err) {
      toast.error('Verification failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-in">
          <h1 className="page-header">Admin Dashboard</h1>
          <p className="text-dark-400 mt-1">Manage users, verifications, and platform health</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-slide-in-delay-1">
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Donors', value: stats?.totalDonors || 0, icon: Heart, color: 'text-brand-400', bg: 'bg-brand-500/10' },
            { label: 'Hospitals', value: stats?.totalHospitals || 0, icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Blood Banks', value: stats?.totalBloodBanks || 0, icon: Database, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Pending', value: stats?.pendingCount || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-dark-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 animate-slide-in-delay-2">
          {[
            { id: 'pending', label: 'Pending Verification', icon: AlertTriangle, count: pendingRequests.length },
            { id: 'users', label: 'All Users', icon: Users },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-400 hover:bg-dark-800 border border-transparent'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.count > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="animate-slide-in-delay-3">
          {tab === 'pending' && (
            pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map(({ user: u, details }) => (
                  <div key={u._id} className="glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
                            {u.role === 'hospital' ? <Building2 className="w-5 h-5 text-emerald-400" /> : <Database className="w-5 h-5 text-violet-400" />}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{u.name}</h3>
                            <p className="text-xs text-dark-500 capitalize">{u.role}</p>
                          </div>
                          <StatusBadge status={u.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p className="text-dark-400">📧 {u.email}</p>
                          <p className="text-dark-400">📱 {u.phone}</p>
                          {details?.licenseNumber && <p className="text-dark-400">📋 License: {details.licenseNumber}</p>}
                          {details?.location?.address && <p className="text-dark-400">📍 {details.location.address}</p>}
                        </div>
                        {u.documentUrl && (
                          <a href={u.documentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-sky-400 hover:text-sky-300">
                            <FileText className="w-3.5 h-3.5" /> View Document <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <p className="text-xs text-dark-600 mt-2">Registered: {new Date(u.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex sm:flex-col gap-2">
                        <button onClick={() => verifyUser(u._id, 'approved')}
                          className="btn-success text-sm py-2 flex items-center gap-1 flex-1">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => verifyUser(u._id, 'rejected')}
                          className="btn-danger text-sm py-2 flex items-center gap-1 flex-1">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckCircle} title="All caught up!" description="No pending verification requests" />
            )
          )}

          {tab === 'users' && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">User</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Role</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Status</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Joined</th>
                      <th className="text-right text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {allUsers.map(u => (
                      <tr key={u._id} className="hover:bg-dark-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-dark-500">{u.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge-info capitalize">{u.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-6 py-4 text-xs text-dark-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.status === 'pending' && u.role !== 'admin' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => verifyUser(u._id, 'approved')}
                                className="text-emerald-400 hover:text-emerald-300 p-1"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => verifyUser(u._id, 'rejected')}
                                className="text-red-400 hover:text-red-300 p-1"><XCircle className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
