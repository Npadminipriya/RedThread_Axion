import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hospitalAPI, searchAPI } from '../services/api';
import { StatusBadge, UrgencyBadge, BloodGroupBadge, BlockchainBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Building2, Plus, Inbox, CheckCircle, ArrowUpCircle, Clock, Phone, MapPin, X, Users, ShieldCheck, XCircle, AlertTriangle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState('requests');
  const [availableDonors, setAvailableDonors] = useState([]);
  const [donorFilter, setDonorFilter] = useState({ bloodGroup: '', lat: '', lng: '' });
  const [nearbyBanks, setNearbyBanks] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
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

  const loadAvailableDonors = async () => {
    try {
      const params = {};
      if (donorFilter.bloodGroup) params.bloodGroup = donorFilter.bloodGroup;
      if (donorFilter.lat) params.lat = donorFilter.lat;
      if (donorFilter.lng) params.lng = donorFilter.lng;
      const { data } = await hospitalAPI.getAvailableDonors(params);
      setAvailableDonors(data.donors || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load donors');
    }
  };

  const loadNearbyBanks = async () => {
    if (!donorFilter.lat || !donorFilter.lng) {
      toast.error('Set your coordinates first');
      return;
    }
    try {
      const { data } = await searchAPI.nearbyBloodBanks(donorFilter.lat, donorFilter.lng, 50);
      setNearbyBanks(data.bloodBanks || []);
    } catch (err) { console.error(err); }
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

  const confirmDonation = async (requestId, donorId, showed) => {
    try {
      await hospitalAPI.confirmDonation(requestId, donorId, showed, '');
      toast.success(showed ? 'Donation confirmed!' : 'Donor flagged as no-show');
      setConfirmModal(null);
      if (selectedRequest) loadRequestDetail(selectedRequest._id);
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    }
  };

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setDonorFilter(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        setForm(prev => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast.success('Location detected!');
      },
      () => toast.error('Could not detect location'),
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <LoadingSpinner />;

  // Rejected state
  if (user?.status === 'rejected') {
    return (
      <div className="min-h-screen pt-20 pb-10 px-4 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Account Rejected</h2>
          <p className="text-dark-400 mb-3">Your hospital account has been rejected by the admin.</p>
          {user?.rejectionReason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-400"><strong>Reason:</strong> {user.rejectionReason}</p>
            </div>
          )}
          <StatusBadge status="rejected" />
        </div>
      </div>
    );
  }

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

  const tabs = [
    { id: 'requests', label: 'Blood Requests', icon: Inbox },
    { id: 'donors', label: 'Available Donors', icon: Users },
    { id: 'nearby', label: 'Nearby Blood Banks', icon: MapPin },
  ];

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-slide-in">
          <div>
            <h1 className="page-header">Hospital Dashboard</h1>
            <p className="text-dark-400 mt-1">{user?.name} 🏥</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Blood Request
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 animate-slide-in-delay-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => {
              setTab(t.id);
              if (t.id === 'donors') loadAvailableDonors();
              if (t.id === 'nearby') loadNearbyBanks();
            }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${tab === t.id ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-dark-400 hover:bg-dark-800 border border-transparent'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
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
              <div className="flex items-center gap-2">
                <button type="button" onClick={getLocation} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> 📍 Use My Location
                </button>
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

        {/* Tab Content */}
        <div className="animate-slide-in-delay-2">
          {/* Requests Tab */}
          {tab === 'requests' && (
            requests.length > 0 ? (
              <div className="grid gap-4">
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
            )
          )}

          {/* Available Donors Tab */}
          {tab === 'donors' && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Blood Group</label>
                    <select value={donorFilter.bloodGroup} onChange={(e) => setDonorFilter({ ...donorFilter, bloodGroup: e.target.value })}
                      className="input-field text-sm py-2 w-28">
                      <option value="">All</option>
                      {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Latitude</label>
                    <input type="number" step="any" value={donorFilter.lat}
                      onChange={(e) => setDonorFilter({ ...donorFilter, lat: e.target.value })}
                      className="input-field text-sm py-2 w-32" placeholder="Lat" />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Longitude</label>
                    <input type="number" step="any" value={donorFilter.lng}
                      onChange={(e) => setDonorFilter({ ...donorFilter, lng: e.target.value })}
                      className="input-field text-sm py-2 w-32" placeholder="Lng" />
                  </div>
                  <button onClick={getLocation} className="text-xs text-brand-400 hover:text-brand-300 pb-2 flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> 📍
                  </button>
                  <button onClick={loadAvailableDonors} className="btn-primary text-sm py-2">Search</button>
                </div>
              </div>
              {availableDonors.length > 0 ? (
                <div className="space-y-3">
                  {availableDonors.map(d => (
                    <div key={d.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <BloodGroupBadge group={d.bloodGroup} />
                        <div>
                          <p className="text-sm text-white font-medium">{d.name}</p>
                          <div className="flex items-center gap-2 text-xs text-dark-500">
                            <span>{d.distance} km away</span>
                            <span>•</span>
                            <span>{d.donationCount} donations</span>
                            {d.isRare && <span className="text-brand-400">RARE</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${d.trustScore >= 60 ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span className={`text-sm font-bold ${d.trustScore >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{d.trustScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} title="No donors found" description="Adjust filters or search area to find available donors" />
              )}
            </div>
          )}

          {/* Nearby Blood Banks Tab */}
          {tab === 'nearby' && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Latitude</label>
                    <input type="number" step="any" value={donorFilter.lat}
                      onChange={(e) => setDonorFilter({ ...donorFilter, lat: e.target.value })}
                      className="input-field text-sm py-2 w-36" placeholder="Lat" />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Longitude</label>
                    <input type="number" step="any" value={donorFilter.lng}
                      onChange={(e) => setDonorFilter({ ...donorFilter, lng: e.target.value })}
                      className="input-field text-sm py-2 w-36" placeholder="Lng" />
                  </div>
                  <button onClick={getLocation} className="text-xs text-brand-400 hover:text-brand-300 pb-2 flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> 📍
                  </button>
                  <button onClick={loadNearbyBanks} className="btn-primary text-sm py-2">Search</button>
                </div>
              </div>
              {nearbyBanks.length > 0 ? (
                <div className="space-y-3">
                  {nearbyBanks.map(bb => (
                    <div key={bb.id} className="glass-card p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm text-white font-semibold">{bb.name}</h4>
                        <span className="text-sm font-bold text-brand-400">{bb.distance} km</span>
                      </div>
                      <p className="text-xs text-dark-500">📍 {bb.address}</p>
                      <p className="text-xs text-dark-500">📱 {bb.phone} · 📧 {bb.email}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {bb.inventory?.map((inv, j) => (
                          <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full
                            ${inv.units > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-dark-800 text-dark-600 border border-dark-700'}`}>
                            {inv.bloodGroup}: {inv.units}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={MapPin} title="No nearby blood banks" description="Enter coordinates and search to find nearby blood banks" />
              )}
            </div>
          )}
        </div>

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
              {/* Matched Donors with Confirm/Flag buttons */}
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
                        <div className="flex items-center gap-2">
                          <StatusBadge status={d.status} />
                          {d.status === 'accepted' && selectedRequest.status !== 'fulfilled' && (
                            <div className="flex gap-1">
                              <button onClick={() => confirmDonation(selectedRequest._id, d.donorId, true)}
                                className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                ✅ Confirm
                              </button>
                              <button onClick={() => confirmDonation(selectedRequest._id, d.donorId, false)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                ❌ No-Show
                              </button>
                            </div>
                          )}
                        </div>
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
      </div>
    </div>
  );
}

function Droplets(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 14.69c1.39 0 2.52-1.16 2.52-2.56 0-.73-.36-1.42-1.08-2.02-.72-.59-1.27-1.29-1.44-2.11-.18.82-.72 1.52-1.44 2.11-.72.6-1.08 1.29-1.08 2.02 0 1.4 1.13 2.56 2.52 2.56z" /></svg>;
}
