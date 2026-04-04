import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hospitalAPI } from '../services/api';
import { StatusBadge, UrgencyBadge, BloodGroupBadge, BlockchainBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Building2, Plus, Inbox, CheckCircle, ArrowUpCircle, Clock, Phone, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: 'O+', units: 1, urgency: 'normal',
    address: '', latitude: '', longitude: '', notes: ''
  });

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const { data } = await hospitalAPI.getRequests();
      setRequests(data.requests || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadRequestDetail = async (id) => {
    try {
      const { data } = await hospitalAPI.getRequest(id);
      setSelectedRequest(data.request);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const createRequest = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await hospitalAPI.createRequest(form);
      toast.success(data.message);
      setShowForm(false);
      setForm({ bloodGroup: 'O+', units: 1, urgency: 'normal', address: '', latitude: '', longitude: '', notes: '' });
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const escalateRequest = async (id) => {
    try {
      await hospitalAPI.escalateRequest(id);
      toast.success('Request escalated to blood banks');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Escalation failed');
    }
  };

  const fulfillRequest = async (id) => {
    try {
      await hospitalAPI.fulfillRequest(id);
      toast.success('Request marked as fulfilled');
      loadRequests();
      setSelectedRequest(null);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen pt-20 pb-10 px-4 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Pending Approval</h2>
          <p className="text-dark-400">Your hospital account is awaiting admin verification. You'll get access once approved.</p>
          <StatusBadge status="pending" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-slide-in">
          <div>
            <h1 className="page-header">Hospital Dashboard</h1>
            <p className="text-dark-400 mt-1">{user?.name} 🏥</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Blood Request
          </button>
        </div>

        {/* Create Request Form */}
        {showForm && (
          <div className="glass-card p-6 mb-8 animate-slide-in">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-brand-400" /> Create Blood Request
            </h3>
            <form onSubmit={createRequest} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Blood Group</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {bloodGroups.map(bg => (
                      <button type="button" key={bg} onClick={() => setForm({ ...form, bloodGroup: bg })}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all
                          ${form.bloodGroup === bg ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50' : 'bg-dark-900 text-dark-400 border border-dark-700'}`}>
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Units Needed</label>
                  <input type="number" min="1" max="20" value={form.units}
                    onChange={(e) => setForm({ ...form, units: e.target.value })}
                    className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Urgency</label>
                  <div className="flex gap-2">
                    {['normal', 'urgent', 'critical'].map(u => (
                      <button type="button" key={u} onClick={() => setForm({ ...form, urgency: u })}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all
                          ${form.urgency === u
                            ? u === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : u === 'urgent' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                            : 'bg-sky-500/20 text-sky-400 border border-sky-500/50'
                            : 'bg-dark-900 text-dark-400 border border-dark-700'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <input type="text" placeholder="Address" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
                <input type="number" placeholder="Latitude" value={form.latitude} step="any"
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="input-field" />
                <input type="number" placeholder="Longitude" value={form.longitude} step="any"
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="input-field" />
              </div>
              <textarea placeholder="Additional notes..." value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field resize-none h-20" />
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                  {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create & Match
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Request Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Request Details</h3>
                <button onClick={() => setSelectedRequest(null)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <BloodGroupBadge group={selectedRequest.bloodGroup} />
                <UrgencyBadge urgency={selectedRequest.urgency} />
                <StatusBadge status={selectedRequest.status} />
                {selectedRequest.blockchainHash && <BlockchainBadge hash={selectedRequest.blockchainHash} />}
              </div>
              {/* Matched Donors */}
              {selectedRequest.matchedDonors?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Matched Donors ({selectedRequest.matchedDonors.length})</h4>
                  <div className="space-y-2">
                    {selectedRequest.matchedDonors.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-dark-500" />
                          <div>
                            <p className="text-sm text-white">{d.userId?.name || 'Donor'}</p>
                            <p className="text-xs text-dark-500">{d.userId?.phone}</p>
                          </div>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Matched Blood Banks */}
              {selectedRequest.matchedBloodBanks?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Blood Banks ({selectedRequest.matchedBloodBanks.length})</h4>
                  <div className="space-y-2">
                    {selectedRequest.matchedBloodBanks.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div>
                          <p className="text-sm text-white">{b.userId?.name || 'Blood Bank'}</p>
                          <p className="text-xs text-dark-500">{b.unitsAvailable} units available</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 mt-4">
                {selectedRequest.status !== 'fulfilled' && (
                  <button onClick={() => fulfillRequest(selectedRequest._id)} className="btn-success text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Mark Fulfilled
                  </button>
                )}
                {!selectedRequest.escalatedToBloodBanks && selectedRequest.status !== 'fulfilled' && (
                  <button onClick={() => { escalateRequest(selectedRequest._id); setSelectedRequest(null); }}
                    className="btn-secondary text-sm flex items-center gap-1">
                    <ArrowUpCircle className="w-4 h-4" /> Escalate to Blood Banks
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Requests List */}
        {requests.length > 0 ? (
          <div className="grid gap-4 animate-slide-in-delay-1">
            {requests.map(req => (
              <div key={req._id} className="glass-card-hover p-6 cursor-pointer" onClick={() => loadRequestDetail(req._id)}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <BloodGroupBadge group={req.bloodGroup} />
                    <UrgencyBadge urgency={req.urgency} />
                    <StatusBadge status={req.status} />
                    <span className="text-sm text-dark-400">{req.units} unit(s)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {req.matchedDonors?.length > 0 && (
                      <span className="text-xs text-dark-500">
                        {req.matchedDonors.filter(d => d.status === 'accepted').length}/{req.matchedDonors.length} accepted
                      </span>
                    )}
                    {!req.escalatedToBloodBanks && req.status !== 'fulfilled' && (
                      <button onClick={(e) => { e.stopPropagation(); escalateRequest(req._id); }}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
                      </button>
                    )}
                  </div>
                </div>
                {req.location?.address && (
                  <p className="text-sm text-dark-500 mt-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {req.location.address}
                  </p>
                )}
                <p className="text-xs text-dark-600 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Inbox} title="No blood requests" description="Create your first blood request to get started" />
        )}
      </div>
    </div>
  );
}

function Droplets(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 14.69c1.39 0 2.52-1.16 2.52-2.56 0-.73-.36-1.42-1.08-2.02-.72-.59-1.27-1.29-1.44-2.11-.18.82-.72 1.52-1.44 2.11-.72.6-1.08 1.29-1.08 2.02 0 1.4 1.13 2.56 2.52 2.56z"/></svg>;
}
