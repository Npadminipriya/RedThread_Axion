import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { donorAPI } from '../services/api';
import { StatusBadge, UrgencyBadge, BloodGroupBadge, BlockchainBadge, LoadingSpinner, EmptyState } from '../components/Shared';
import { Droplets, Coins, Trophy, History, CheckCircle, XCircle, Clock, Award, TrendingUp, Heart, Shield, Star, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [coins, setCoins] = useState({ coins: 0, transactions: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState({ history: [], blockchainRecords: [] });
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, requestsRes, coinsRes, historyRes] = await Promise.all([
        donorAPI.getProfile().catch(() => null),
        donorAPI.getRequests().catch(() => ({ data: { requests: [] } })),
        donorAPI.getCoins().catch(() => ({ data: { coins: 0, transactions: [] } })),
        donorAPI.getHistory().catch(() => ({ data: { history: [], blockchainRecords: [] } })),
      ]);
      if (profileRes?.data?.donor) setProfile(profileRes.data.donor);
      setRequests(requestsRes?.data?.requests || []);
      setCoins(coinsRes?.data || { coins: 0, transactions: [] });
      setHistory(historyRes?.data || { history: [], blockchainRecords: [] });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await donorAPI.getLeaderboard();
      setLeaderboard(data.leaderboard || []);
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

  if (loading) return <LoadingSpinner />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Heart },
    { id: 'requests', label: 'Requests', icon: Inbox },
    { id: 'history', label: 'History', icon: History },
    { id: 'coins', label: 'Coins', icon: Coins },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const isInCooldown = profile?.cooldownUntil && new Date(profile.cooldownUntil) > new Date();

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-in-delay-1">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400">
              <Droplets className="w-4 h-4" /> Blood Group
            </div>
            <BloodGroupBadge group={profile?.bloodGroup || 'O+'} />
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400">
              <Coins className="w-4 h-4" /> Coins
            </div>
            <p className="text-2xl font-bold text-amber-400">{coins.coins || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400">
              <TrendingUp className="w-4 h-4" /> Donations
            </div>
            <p className="text-2xl font-bold text-white">{profile?.donationCount || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-dark-400">
              <Award className="w-4 h-4" /> Badges
            </div>
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
              onClick={() => { setTab(t.id); if (t.id === 'leaderboard') loadLeaderboard(); }}
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
          {tab === 'overview' && (
            <div className="grid gap-4">
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
                      {req.location?.address && (
                        <p className="text-sm text-dark-400 mb-3">📍 {req.location.address}</p>
                      )}
                      <p className="text-xs text-dark-500 mb-4">{new Date(req.createdAt).toLocaleString()}</p>
                      {(!myMatch || myMatch.status === 'pending' || myMatch.status === 'called') && (
                        <div className="flex gap-3">
                          <button onClick={() => respondToRequest(req._id, 'accepted')}
                            className="btn-success text-sm py-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Accept
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
              <EmptyState icon={Inbox} title="No pending requests" description="You'll see blood requests here when you're matched" />
            )
          )}

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
                    <p className="text-xs text-dark-500">False accept</p>
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
