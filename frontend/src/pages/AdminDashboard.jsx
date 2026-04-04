import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Shield, Users, Building2, Database, Clock, CheckCircle, XCircle, AlertTriangle, Heart, FileText, ExternalLink, Activity, Wallet, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [docPreview, setDocPreview] = useState(null);

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

  const loadExpenses = async () => {
    try {
      const { data } = await adminAPI.getExpenses('pending');
      setExpenses(data.expenses || []);
    } catch (err) { console.error(err); }
  };

  const loadEmergency = async () => {
    try {
      const { data } = await adminAPI.getEmergencyStats();
      setEmergency(data.emergency || null);
    } catch (err) { console.error(err); }
  };

  const verifyUser = async (id, status, reason) => {
    try {
      await adminAPI.verifyUser(id, status, reason);
      toast.success(`User ${status} successfully`);
      setRejectModal(null);
      setRejectionReason('');
      loadData();
    } catch (err) {
      toast.error('Verification failed');
    }
  };

  const processExpense = async (id, status, note) => {
    try {
      await adminAPI.processExpense(id, status, note);
      toast.success(`Expense ${status}`);
      loadExpenses();
    } catch (err) {
      toast.error('Failed to process expense');
    }
  };

  const openDocument = async (userId) => {
    try {
      const { data } = await adminAPI.getDocument(userId);
      if (data.documentUrl) {
        setDocPreview(data);
      }
    } catch (err) {
      toast.error('No document found');
    }
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'pending', label: 'Pending Verification', icon: AlertTriangle, count: pendingRequests.length },
    { id: 'users', label: 'All Users', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'emergency', label: 'Emergency Dashboard', icon: Activity },
  ];

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-in">
          <h1 className="page-header">Admin Dashboard</h1>
          <p className="text-dark-400 mt-1">Manage users, verifications, expenses, and platform health</p>
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
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 animate-slide-in-delay-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => {
              setTab(t.id);
              if (t.id === 'expenses') loadExpenses();
              if (t.id === 'emergency') loadEmergency();
            }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
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
          {/* Pending Tab */}
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
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => openDocument(u._id)}
                              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                            <a href={`http://localhost:5000${u.documentUrl}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
                              <ExternalLink className="w-3 h-3" /> Open in Tab
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-dark-600 mt-2">Registered: {new Date(u.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex sm:flex-col gap-2">
                        <button onClick={() => verifyUser(u._id, 'approved')}
                          className="btn-success text-sm py-2 flex items-center gap-1 flex-1">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => setRejectModal(u)}
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

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">User</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Role</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Status</th>
                      <th className="text-left text-xs font-semibold text-dark-400 uppercase tracking-wider px-6 py-4">Details</th>
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
                          {u.status === 'rejected' && u.rejectionReason && (
                            <p className="text-xs text-red-400 mt-1">Reason: {u.rejectionReason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-dark-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.status === 'pending' && u.role !== 'admin' && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => verifyUser(u._id, 'approved')}
                                className="text-emerald-400 hover:text-emerald-300 p-1"><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => setRejectModal(u)}
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

          {/* Expenses Tab */}
          {tab === 'expenses' && (
            expenses.length > 0 ? (
              <div className="space-y-4">
                {expenses.map(exp => (
                  <div key={exp._id} className="glass-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Wallet className="w-5 h-5 text-amber-400" />
                          <h3 className="font-semibold text-white">₹{exp.amount}</h3>
                          <StatusBadge status={exp.status} />
                        </div>
                        <p className="text-sm text-dark-400">{exp.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                          <span>By: {exp.userId?.name || 'Unknown'}</span>
                          <span>📧 {exp.userId?.email}</span>
                          {exp.requestId && <span>🩸 {exp.requestId.bloodGroup}</span>}
                        </div>
                        {exp.receiptUrl && (
                          <a href={`http://localhost:5000${exp.receiptUrl}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-sky-400 hover:text-sky-300">
                            <FileText className="w-3.5 h-3.5" /> View Receipt <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <p className="text-xs text-dark-600 mt-1">Submitted: {new Date(exp.createdAt).toLocaleString()}</p>
                      </div>
                      {exp.status === 'pending' && (
                        <div className="flex sm:flex-col gap-2">
                          <button onClick={() => processExpense(exp._id, 'approved', '')}
                            className="btn-success text-sm py-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => processExpense(exp._id, 'rejected', 'Expense not eligible')}
                            className="btn-danger text-sm py-2 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Wallet} title="No pending expenses" description="Transport expense claims will appear here" />
            )
          )}

          {/* Emergency Dashboard Tab */}
          {tab === 'emergency' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-400" /> Live Emergency Dashboard
                </h3>
                <button onClick={loadEmergency} className="btn-secondary text-sm py-2 flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
              {emergency ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Active Requests', value: emergency.activeRequests, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      { label: 'Matched', value: emergency.matchedRequests, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                      { label: 'Fulfilled', value: emergency.fulfilledRequests, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { label: 'Fulfillment Rate', value: `${emergency.fulfillmentRate}%`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    ].map((s, i) => (
                      <div key={i} className="stat-card text-center">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-dark-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="stat-card">
                      <p className="text-dark-400 text-sm">Available Donors</p>
                      <p className="text-3xl font-bold text-emerald-400">{emergency.availableDonors} <span className="text-sm text-dark-500">/ {emergency.totalDonors}</span></p>
                    </div>
                    <div className="stat-card">
                      <p className="text-dark-400 text-sm">Escalated Requests</p>
                      <p className="text-3xl font-bold text-orange-400">{emergency.escalatedRequests}</p>
                    </div>
                  </div>
                  {/* Recent Active Requests */}
                  {emergency.recentRequests?.length > 0 && (
                    <div className="glass-card p-6">
                      <h4 className="text-sm font-semibold text-dark-300 mb-4">Active Requests Feed</h4>
                      <div className="space-y-3">
                        {emergency.recentRequests.map(req => (
                          <div key={req._id} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">🩸</span>
                              <div>
                                <p className="text-sm text-white font-medium">{req.bloodGroup} — {req.units} unit(s)</p>
                                <p className="text-xs text-dark-500">{req.hospitalId?.name || 'Hospital'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={req.status} />
                              <span className="text-xs text-dark-600">{new Date(req.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-500">Loading emergency data...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-2">Reject {rejectModal.name}?</h3>
              <p className="text-sm text-dark-400 mb-4">Please provide a reason for rejection:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field resize-none h-24 mb-4"
                placeholder="Enter rejection reason..."
              />
              <div className="flex gap-3">
                <button onClick={() => verifyUser(rejectModal._id, 'rejected', rejectionReason)}
                  className="btn-danger flex-1 text-sm flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" /> Confirm Rejection
                </button>
                <button onClick={() => { setRejectModal(null); setRejectionReason(''); }}
                  className="btn-secondary flex-1 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {docPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{docPreview.name} — License Document</h3>
                <button onClick={() => setDocPreview(null)} className="text-dark-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              {docPreview.documentUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img src={docPreview.documentUrl} alt="License" className="w-full rounded-xl border border-dark-700" />
              ) : docPreview.documentUrl?.match(/\.pdf$/i) ? (
                <iframe src={docPreview.documentUrl} className="w-full h-96 rounded-xl border border-dark-700" title="License PDF" />
              ) : (
                <a href={docPreview.documentUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Open Document
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
