import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donorAPI, expenseAPI, searchAPI } from '../services/api';
import { StatusBadge, UrgencyBadge, BloodGroupBadge, BlockchainBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Droplets, Coins, Trophy, History, CheckCircle, XCircle, Clock, Award, TrendingUp, Heart, Shield, Star, Inbox, Edit3, Save, X, Wallet, MapPin, Upload, Navigation, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [coins, setCoins] = useState({ coins: 0, transactions: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState({ history: [], blockchainRecords: [] });
  const [trustScore, setTrustScore] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [nearbyData, setNearbyData] = useState({ hospitals: [], bloodBanks: [] });
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [expenseForm, setExpenseForm] = useState({ amount: '', requestId: '', description: '' });
  const [expenseReceipt, setExpenseReceipt] = useState(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, requestsRes, coinsRes, historyRes, trustRes] = await Promise.all([
        donorAPI.getProfile().catch(() => null),
        donorAPI.getRequests().catch(() => ({ data: { requests: [] } })),
        donorAPI.getCoins().catch(() => ({ data: { coins: 0, transactions: [] } })),
        donorAPI.getHistory().catch(() => ({ data: { history: [], blockchainRecords: [] } })),
        donorAPI.getTrustScore().catch(() => ({ data: null })),
      ]);
      if (profileRes?.data?.donor) {
        setProfile(profileRes.data.donor);
        setEditForm({
          name: profileRes.data.donor.userId?.name || '',
          phone: profileRes.data.donor.userId?.phone || '',
          bloodGroup: profileRes.data.donor.bloodGroup || 'O+',
          address: profileRes.data.donor.location?.address || '',
          latitude: profileRes.data.donor.location?.coordinates?.[1] || '',
          longitude: profileRes.data.donor.location?.coordinates?.[0] || '',
        });
      }
      setRequests(requestsRes?.data?.requests || []);
      setCoins(coinsRes?.data || { coins: 0, transactions: [] });
      setHistory(historyRes?.data || { history: [], blockchainRecords: [] });
      if (trustRes?.data) setTrustScore(trustRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await donorAPI.getLeaderboard();
      setLeaderboard(data.leaderboard || []);
    } catch (err) { console.error(err); }
  };

  const loadWallet = async () => {
    try {
      const [walletRes, expensesRes] = await Promise.all([
        expenseAPI.getWallet(),
        expenseAPI.getMyExpenses(),
      ]);
      setWallet(walletRes?.data?.wallet || null);
      setExpenses(expensesRes?.data?.expenses || []);
    } catch (err) { console.error(err); }
  };

  const loadNearby = async () => {
    const lat = profile?.location?.coordinates?.[1];
    const lng = profile?.location?.coordinates?.[0];
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      toast.error('Location not set. Update your profile with coordinates.');
      return;
    }
    try {
      const [hospRes, bbRes] = await Promise.all([
        searchAPI.nearbyHospitals(lat, lng, 50),
        searchAPI.nearbyBloodBanks(lat, lng, 50),
      ]);
      setNearbyData({
        hospitals: hospRes?.data?.hospitals || [],
        bloodBanks: bbRes?.data?.bloodBanks || [],
      });
    } catch (err) { console.error(err); }
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await donorAPI.toggleAvailability(!profile.availability);
      setProfile({ ...profile, availability: data.availability });
      toast.success(data.availability ? 'You are now available' : 'You are now unavailable');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const respondToRequest = async (requestId, response) => {
    try {
      await donorAPI.respondToRequest(requestId, response);
      toast.success(`Request ${response}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    }
  };

  const saveProfile = async () => {
    try {
      await donorAPI.updateProfile(editForm);
      toast.success('Profile updated!');
      setEditing(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.requestId || !expenseReceipt) {
      toast.error('Amount, request, and receipt are required');
      return;
    }
    setSubmittingExpense(true);
    try {
      const fd = new FormData();
      fd.append('amount', expenseForm.amount);
      fd.append('requestId', expenseForm.requestId);
      fd.append('description', expenseForm.description || 'Transport expense');
      fd.append('receipt', expenseReceipt);
      await expenseAPI.submit(fd);
      toast.success('Expense submitted!');
      setExpenseForm({ amount: '', requestId: '', description: '' });
      setExpenseReceipt(null);
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setEditForm(prev => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast.success('Location detected!');
      },
      () => toast.error('Could not detect location'),
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Heart },
    { id: 'profile', label: 'Profile', icon: Edit3 },
    { id: 'requests', label: 'Requests', icon: Inbox },
    { id: 'history', label: 'History', icon: History },
    { id: 'coins', label: 'Coins', icon: Coins },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'nearby', label: 'Nearby', icon: MapPin },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isInCooldown = profile?.cooldownUntil && new Date(profile.cooldownUntil) > new Date();
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const scoreColor = (trustScore?.trustScore ?? 100) >= 90 ? 'text-emerald-400' : (trustScore?.trustScore ?? 100) >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-slide-in">
          <div>
            <h1 className="page-header">Donor Dashboard</h1>
            <p className="text-dark-400 mt-1">Welcome back, {user?.name} 🩸</p>
          </div>
          <button onClick={toggleAvailability}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2
              ${profile?.availability
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:bg-dark-700'}`}
            disabled={isInCooldown}>
            <div className={`w-3 h-3 rounded-full ${profile?.availability ? 'bg-emerald-400 animate-pulse' : 'bg-dark-500'}`} />
            {profile?.availability ? 'Available' : 'Not Available'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-slide-in-delay-1">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400"><Droplets className="w-4 h-4" /> Blood Group</div>
            <BloodGroupBadge group={profile?.bloodGroup || 'O+'} />
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400"><Coins className="w-4 h-4" /> Coins</div>
            <p className="text-2xl font-bold text-amber-400">{coins.coins || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400"><TrendingUp className="w-4 h-4" /> Donations</div>
            <p className="text-2xl font-bold text-white">{profile?.donationCount || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400"><ShieldCheck className="w-4 h-4" /> Trust Score</div>
            <p className={`text-2xl font-bold ${scoreColor}`}>{trustScore?.trustScore ?? 100}</p>
            <p className="text-xs text-dark-500">{trustScore?.rating || 'Excellent'}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400"><Award className="w-4 h-4" /> Badges</div>
            <div className="flex flex-wrap gap-1">
              {profile?.badges?.length > 0
                ? profile.badges.map((b, i) => <span key={i} className="badge-info text-xs">{b}</span>)
                : <span className="text-sm text-dark-500">None yet</span>
              }
            </div>
          </div>
        </div>

        {/* Cooldown Warning */}
        {isInCooldown && (
          <div className="glass-card p-4 mb-6 border-amber-500/30 bg-amber-500/5 animate-slide-in-delay-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-400 font-semibold text-sm">Cooldown Active</p>
                <p className="text-xs text-dark-400">Next available: {new Date(profile.cooldownUntil).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 animate-slide-in-delay-2">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'leaderboard') loadLeaderboard();
                if (t.id === 'wallet') loadWallet();
                if (t.id === 'nearby') loadNearby();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${tab === t.id
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200 border border-transparent'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === 'requests' && requests.length > 0 && (
                <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{requests.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-slide-in-delay-3">
          {/* Overview */}
          {tab === 'overview' && (
            <div className="grid gap-4">
              {/* Trust Score Card */}
              {trustScore && (
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Trust Score Breakdown
                  </h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                      <p className={`text-2xl font-bold ${scoreColor}`}>{trustScore.trustScore}</p>
                      <p className="text-xs text-dark-500">Score</p>
                    </div>
                    <div className="p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                      <p className="text-2xl font-bold text-sky-400">{trustScore.acceptedCount}</p>
                      <p className="text-xs text-dark-500">Accepted</p>
                    </div>
                    <div className="p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                      <p className="text-2xl font-bold text-emerald-400">{trustScore.completedCount}</p>
                      <p className="text-xs text-dark-500">Completed</p>
                    </div>
                    <div className="p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                      <p className="text-2xl font-bold text-red-400">{trustScore.falseAcceptCount}</p>
                      <p className="text-xs text-dark-500">No-Shows</p>
                    </div>
                  </div>
                  {!trustScore.isReliable && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400">⚠️ Your trust score is below 60. Complete more donations to improve your reliability rating.</p>
                    </div>
                  )}
                </div>
              )}
              {/* Blockchain Records */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-400" /> Blockchain Records
                </h3>
                {history.blockchainRecords?.length > 0 ? (
                  <div className="space-y-3">
                    {history.blockchainRecords.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div>
                          <BlockchainBadge hash={r.hash} />
                          <p className="text-xs text-dark-500 mt-1 font-mono">{r.hash?.slice(0, 20)}...</p>
                        </div>
                        <p className="text-xs text-dark-500">{new Date(r.donationDate).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-500 text-sm">No blockchain records yet. Donate blood to get verified records!</p>
                )}
              </div>
            </div>
          )}

          {/* Profile Edit */}
          {tab === 'profile' && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-400" /> Edit Profile
                </h3>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={saveProfile} className="btn-success text-sm py-2 flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-2">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-2 flex items-center gap-1"><Edit3 className="w-4 h-4" /> Edit</button>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Name</label>
                    <input type="text" value={editForm.name} disabled={!editing}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                    <input type="tel" value={editForm.phone} disabled={!editing}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Blood Group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {bloodGroups.map(bg => (
                      <button type="button" key={bg} disabled={!editing}
                        onClick={() => editing && setEditForm({...editForm, bloodGroup: bg})}
                        className={`py-2 rounded-lg text-sm font-bold transition-all
                          ${editForm.bloodGroup === bg ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50' : 'bg-dark-800 text-dark-400 border border-dark-700'}
                          ${!editing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-dark-300">Address</label>
                    {editing && (
                      <button type="button" onClick={getLocation} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> 📍 Use My Location
                      </button>
                    )}
                  </div>
                  <input type="text" value={editForm.address} disabled={!editing}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="input-field" />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <input type="number" value={editForm.latitude} disabled={!editing}
                      onChange={(e) => setEditForm({...editForm, latitude: e.target.value})}
                      className="input-field text-sm" placeholder="Latitude" step="any" />
                    <input type="number" value={editForm.longitude} disabled={!editing}
                      onChange={(e) => setEditForm({...editForm, longitude: e.target.value})}
                      className="input-field text-sm" placeholder="Longitude" step="any" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Availability</label>
                  <button onClick={editing ? toggleAvailability : undefined}
                    disabled={!editing || isInCooldown}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${profile?.availability ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-800 text-dark-400 border border-dark-700'}`}>
                    {profile?.availability ? '✅ Available' : '❌ Not Available'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Requests */}
          {tab === 'requests' && (
            requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map(req => {
                  const myMatch = req.matchedDonors?.find(d =>
                    d.userId === user?.id || d.userId?._id === user?.id
                  );
                  return (
                    <div key={req._id} className="glass-card p-6">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <BloodGroupBadge group={req.bloodGroup} />
                        <UrgencyBadge urgency={req.urgency} />
                        <StatusBadge status={myMatch?.status || req.status} />
                        <span className="text-sm text-dark-500">{req.units} unit(s)</span>
                      </div>
                      {req.location?.address && <p className="text-sm text-dark-400 mb-3">📍 {req.location.address}</p>}
                      <p className="text-xs text-dark-500 mb-4">{new Date(req.createdAt).toLocaleString()}</p>
                      {(!myMatch || myMatch.status === 'pending' || myMatch.status === 'called') && (
                        <div className="flex gap-3">
                          <button onClick={() => respondToRequest(req._id, 'accepted')} className="btn-success text-sm py-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Accept
                          </button>
                          <button onClick={() => respondToRequest(req._id, 'rejected')} className="btn-danger text-sm py-2 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Inbox} title="No pending requests" description="You'll see blood requests here when you're matched" />
            )
          )}

          {/* History */}
          {tab === 'history' && (
            history.history?.length > 0 ? (
              <div className="space-y-3">
                {history.history.map(req => (
                  <div key={req._id} className="glass-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <BloodGroupBadge group={req.bloodGroup} />
                      <div>
                        <p className="text-sm text-white font-medium">{req.units} unit(s) requested</p>
                        <p className="text-xs text-dark-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                        {req.completion && (
                          <p className={`text-xs mt-1 ${req.completion.donorShowedUp ? 'text-emerald-400' : 'text-red-400'}`}>
                            {req.completion.donorShowedUp ? '✅ Confirmed by hospital' : '❌ Flagged as no-show'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      {req.blockchainHash && <BlockchainBadge hash={req.blockchainHash} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={History} title="No history yet" description="Your donation history will appear here" />
            )
          )}

          {/* Coins */}
          {tab === 'coins' && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-dark-400 text-sm">Total Balance</p>
                  <p className="text-4xl font-bold text-amber-400">{coins.coins} <span className="text-lg">coins</span></p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Coins className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <div className="bg-dark-900/50 rounded-xl p-4 mb-4">
                <p className="text-xs text-dark-500 mb-2">Coin System</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 text-lg font-bold">+50</p>
                    <p className="text-xs text-dark-500">Per donation</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-lg font-bold">+100</p>
                    <p className="text-xs text-dark-500">Rare blood</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-lg font-bold">-30</p>
                    <p className="text-xs text-dark-500">No-show</p>
                  </div>
                </div>
              </div>
              {coins.transactions?.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-dark-300">Recent Transactions</h4>
                  {coins.transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                      <div>
                        <p className="text-sm text-white">{t.reason}</p>
                        <p className="text-xs text-dark-500">{new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`font-bold ${t.type === 'earned' || t.type === 'bonus' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'earned' || t.type === 'bonus' ? '+' : '-'}{Math.abs(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-sm text-center py-4">No transactions yet</p>
              )}
            </div>
          )}

          {/* Wallet */}
          {tab === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet Summary */}
              {wallet && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="stat-card text-center">
                    <p className="text-amber-400 text-2xl font-bold">₹{wallet.pendingAmount}</p>
                    <p className="text-xs text-dark-500">Pending</p>
                    <p className="text-[10px] text-dark-600">{wallet.pendingClaims} claims</p>
                  </div>
                  <div className="stat-card text-center">
                    <p className="text-emerald-400 text-2xl font-bold">₹{wallet.approvedAmount}</p>
                    <p className="text-xs text-dark-500">Approved</p>
                    <p className="text-[10px] text-dark-600">{wallet.approvedClaims} claims</p>
                  </div>
                  <div className="stat-card text-center">
                    <p className="text-white text-2xl font-bold">₹{wallet.pendingAmount + wallet.approvedAmount}</p>
                    <p className="text-xs text-dark-500">Total</p>
                    <p className="text-[10px] text-dark-600">{wallet.totalClaims} total</p>
                  </div>
                </div>
              )}

              {/* Submit Expense */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-brand-400" /> Submit Transport Expense
                </h3>
                <form onSubmit={submitExpense} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Amount (₹)</label>
                      <input type="number" min="1" value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                        className="input-field" placeholder="Enter amount" required />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Donation Request ID</label>
                      <select value={expenseForm.requestId}
                        onChange={(e) => setExpenseForm({...expenseForm, requestId: e.target.value})}
                        className="input-field" required>
                        <option value="">Select donation...</option>
                        {history.history?.filter(h => h.status === 'fulfilled' || h.status === 'matched').map(h => (
                          <option key={h._id} value={h._id}>{h.bloodGroup} — {new Date(h.createdAt).toLocaleDateString()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1.5">Receipt</label>
                    <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-dark-600 hover:border-brand-500/50 cursor-pointer transition-all bg-dark-900/50">
                      <Upload className="w-5 h-5 text-dark-500" />
                      <span className="text-sm text-dark-400">{expenseReceipt ? expenseReceipt.name : 'Upload receipt (PDF, JPG, PNG)'}</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setExpenseReceipt(e.target.files[0])} className="hidden" />
                    </label>
                  </div>
                  <button type="submit" disabled={submittingExpense} className="btn-primary flex items-center gap-2">
                    {submittingExpense ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                    Submit Expense
                  </button>
                </form>
              </div>

              {/* Expense History */}
              {expenses.length > 0 && (
                <div className="glass-card p-6">
                  <h4 className="text-sm font-semibold text-dark-300 mb-4">Expense History</h4>
                  <div className="space-y-3">
                    {expenses.map(exp => (
                      <div key={exp._id} className="flex items-center justify-between p-3 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div>
                          <p className="text-sm text-white font-medium">₹{exp.amount}</p>
                          <p className="text-xs text-dark-500">{exp.description} — {new Date(exp.createdAt).toLocaleDateString()}</p>
                          {exp.adminNote && <p className="text-xs text-dark-500 mt-1">Note: {exp.adminNote}</p>}
                        </div>
                        <StatusBadge status={exp.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nearby */}
          {tab === 'nearby' && (
            <div className="space-y-6">
              {nearbyData.hospitals.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" /> Nearby Hospitals ({nearbyData.hospitals.length})
                  </h3>
                  <div className="space-y-3">
                    {nearbyData.hospitals.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div>
                          <p className="text-sm text-white font-medium">{h.name}</p>
                          <p className="text-xs text-dark-500">{h.address}</p>
                          <p className="text-xs text-dark-500">📱 {h.phone} · 📧 {h.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-400">{h.distance} km</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nearbyData.bloodBanks.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-violet-400" /> Nearby Blood Banks ({nearbyData.bloodBanks.length})
                  </h3>
                  <div className="space-y-3">
                    {nearbyData.bloodBanks.map(bb => (
                      <div key={bb.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div>
                          <p className="text-sm text-white font-medium">{bb.name}</p>
                          <p className="text-xs text-dark-500">{bb.address}</p>
                          <p className="text-xs text-dark-500">📱 {bb.phone} · Total: {bb.totalUnits} units</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {bb.inventory?.map((inv, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400">{inv.bloodGroup}: {inv.units}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-400">{bb.distance} km</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nearbyData.hospitals.length === 0 && nearbyData.bloodBanks.length === 0 && (
                <EmptyState icon={MapPin} title="No nearby facilities" description="Update your location to find nearby hospitals and blood banks" />
              )}
            </div>
          )}

          {/* Leaderboard */}
          {tab === 'leaderboard' && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Top Donors
              </h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((d, i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 rounded-xl transition-all
                      ${i < 3 ? 'bg-dark-800/80 border border-dark-700' : 'bg-dark-900/50'}`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-800 text-dark-500'}`}>
                        {i < 3 ? <Star className="w-4 h-4" /> : d.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-medium">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-dark-500">{d.donations} donations</span>
                          <span className="text-xs text-dark-500">•</span>
                          <span className="text-xs text-dark-500">{d.bloodGroup}</span>
                          <span className="text-xs text-dark-500">• Trust: {d.trustScore ?? 100}</span>
                          {d.badges?.map((b, j) => <span key={j} className="badge-info text-[10px]">{b}</span>)}
                        </div>
                      </div>
                      <span className="text-amber-400 font-bold">{d.coins} <span className="text-xs text-dark-500">coins</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-sm text-center py-8">Loading leaderboard...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
