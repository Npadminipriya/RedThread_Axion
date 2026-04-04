import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bloodBankAPI } from '../services/api';
import { StatusBadge, UrgencyBadge, BloodGroupBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Database, Package, Inbox, CheckCircle, XCircle, Clock, Save, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function BloodBankDashboard() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editInventory, setEditInventory] = useState([]);
  const [tab, setTab] = useState('inventory');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [invRes, reqRes] = await Promise.all([
        bloodBankAPI.getInventory().catch(() => ({ data: { inventory: [] } })),
        bloodBankAPI.getRequests().catch(() => ({ data: { requests: [] } })),
      ]);
      const inv = invRes?.data?.inventory || [];
      setInventory(inv);
      setEditInventory(inv.map(i => ({ ...i })));
      setRequests(reqRes?.data?.requests || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const saveInventory = async () => {
    try {
      const { data } = await bloodBankAPI.updateInventory(editInventory);
      setInventory(data.inventory || editInventory);
      setEditing(false);
      toast.success('Inventory updated!');
    } catch (err) {
      toast.error('Failed to update inventory');
    }
  };

  const respondToRequest = async (requestId, response) => {
    try {
      await bloodBankAPI.respondToRequest(requestId, response);
      toast.success(`Request ${response}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen pt-20 pb-10 px-4 flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-md">
          <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Pending Approval</h2>
          <p className="text-dark-400 mb-4">Your blood bank account is awaiting admin verification.</p>
          <StatusBadge status="pending" />
        </div>
      </div>
    );
  }

  const totalUnits = inventory.reduce((acc, i) => acc + (i.units || 0), 0);

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-slide-in">
          <div>
            <h1 className="page-header">Blood Bank Dashboard</h1>
            <p className="text-dark-400 mt-1">{user?.name} 🏥</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="stat-card py-3 px-5">
              <span className="text-dark-500 text-xs">Total Stock</span>
              <span className="text-2xl font-bold text-brand-400">{totalUnits} <span className="text-sm text-dark-500">units</span></span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 animate-slide-in-delay-1">
          {[
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'requests', label: 'Requests', icon: Inbox },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-400 hover:bg-dark-800 border border-transparent'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === 'requests' && requests.length > 0 && (
                <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="animate-slide-in-delay-2">
          {tab === 'inventory' && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-400" /> Blood Inventory
                </h3>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={saveInventory} className="btn-success text-sm py-2 flex items-center gap-1">
                      <Save className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => { setEditing(false); setEditInventory(inventory.map(i => ({ ...i }))); }}
                      className="btn-secondary text-sm py-2">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-2 flex items-center gap-1">
                    <Edit3 className="w-4 h-4" /> Edit Stock
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(editing ? editInventory : inventory).map((item, i) => {
                  const isLow = item.units > 0 && item.units <= 3;
                  const isEmpty = item.units === 0;
                  return (
                    <div key={i} className={`p-4 rounded-xl border transition-all text-center
                      ${isEmpty ? 'bg-dark-900/80 border-dark-700' : isLow ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                      <p className="text-lg font-bold text-white mb-1">🩸 {item.bloodGroup}</p>
                      {editing ? (
                        <input type="number" min="0" value={editInventory[i]?.units || 0}
                          onChange={(e) => {
                            const updated = [...editInventory];
                            updated[i] = { ...updated[i], units: parseInt(e.target.value) || 0 };
                            setEditInventory(updated);
                          }}
                          className="input-field text-center text-xl font-bold py-2 w-full" />
                      ) : (
                        <p className={`text-3xl font-bold ${isEmpty ? 'text-dark-600' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.units}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${isEmpty ? 'text-dark-600' : isLow ? 'text-amber-500' : 'text-dark-500'}`}>
                        {isEmpty ? 'Empty' : isLow ? 'Low stock' : 'units'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'requests' && (
            requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map(req => {
                  const myMatch = req.matchedBloodBanks?.find(b =>
                    b.userId === user?.id || b.userId?._id === user?.id || b.userId === user?._id
                  );
                  return (
                    <div key={req._id} className="glass-card p-6">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <BloodGroupBadge group={req.bloodGroup} />
                        <UrgencyBadge urgency={req.urgency} />
                        <StatusBadge status={myMatch?.status || req.status} />
                        <span className="text-sm text-dark-400">{req.units} unit(s)</span>
                      </div>
                      {req.location?.address && (
                        <p className="text-sm text-dark-500 mb-2">📍 {req.location.address}</p>
                      )}
                      <p className="text-xs text-dark-600 mb-4">{new Date(req.createdAt).toLocaleString()}</p>
                      {(!myMatch || myMatch.status === 'pending' || myMatch.status === 'called') && (
                        <div className="flex gap-3">
                          <button onClick={() => respondToRequest(req._id, 'accepted')}
                            className="btn-success text-sm py-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Accept & Supply
                          </button>
                          <button onClick={() => respondToRequest(req._id, 'rejected')}
                            className="btn-danger text-sm py-2 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Inbox} title="No requests" description="Blood requests assigned to your bank will appear here" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
