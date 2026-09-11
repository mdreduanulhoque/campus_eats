import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Wallet, 
  Award, 
  AlertTriangle, 
  Bell, 
  Check, 
  ShieldAlert, 
  Save,
  CheckCircle2
} from 'lucide-react';

export const Profile = () => {
  const { user, reloadProfile } = useAuth();
  const [budgetLimit, setBudgetLimit] = useState(user?.daily_budget_limit || 0);
  const [notifications, setNotifications] = useState([]);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState('');
  const [budgetError, setBudgetError] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/users/notifications');
      setNotifications(res.data.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    setBudgetSuccess('');
    setBudgetError('');
    setSavingBudget(true);

    try {
      await api.patch('/users/budget', { daily_budget_limit: parseFloat(budgetLimit) });
      await reloadProfile();
      setBudgetSuccess('Daily budget limit updated successfully!');
    } catch (err) {
      setBudgetError(err.response?.data?.message || 'Failed to update budget limit.');
    } finally {
      setSavingBudget(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await api.patch(`/users/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12 space-y-6">
      {/* Account Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xl">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{user?.name}</h1>
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Loyalty Points Pill */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Award className="w-8 h-8 text-amber-600" />
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Loyalty Points
            </span>
            <p className="text-xl font-black text-amber-900">{user?.loyalty_points || 0} pts</p>
            <span className="text-[10px] text-amber-700 font-medium">
              = {(user?.loyalty_points || 0) * 5} BDT in discounts
            </span>
          </div>
        </div>
      </div>

      {/* Penalties & Blockade Status */}
      <div className={`p-5 rounded-3xl border ${
        user?.is_blocked
          ? 'bg-red-50 border-red-300'
          : user?.penalty_flags > 0
          ? 'bg-amber-50 border-amber-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          {user?.is_blocked ? (
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          ) : user?.penalty_flags > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              {user?.is_blocked
                ? 'Account Suspended'
                : user?.penalty_flags > 0
                ? `Penalty Strikes: ${user.penalty_flags}/3`
                : 'Account in Good Standing'}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {user?.is_blocked
                ? 'You have reached 3 penalty strikes for not picking up ready meals within 30 minutes. Please contact the Local Admin to unblock.'
                : user?.penalty_flags > 0
                ? `You have ${user.penalty_flags} no-show strike(s). If you reach 3 strikes, your ordering privileges will be suspended.`
                : 'Zero penalty strikes recorded. Remember to pick up orders within 30 minutes of preparation to avoid strikes.'}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Budget Limit Setting */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
          <Wallet className="w-5 h-5" />
          <span>The Budget Guardrail Settings</span>
        </div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900">Daily Spending Limit</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Set a maximum daily allowance to prevent overspending on campus food. The checkout API blocks any order that would exceed this threshold for the current day.
          </p>
        </div>

        {budgetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
            {budgetSuccess}
          </div>
        )}
        {budgetError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
            {budgetError}
          </div>
        )}

        <form onSubmit={handleUpdateBudget} className="flex flex-col sm:flex-row items-end gap-3 pt-2">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Daily Limit (BDT) — Set 0 for no limit
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingBudget}
            className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{savingBudget ? 'Saving...' : 'Update Limit'}</span>
          </button>
        </form>
      </div>

      {/* Notifications Drawer / List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Bell className="w-5 h-5 text-orange-500" />
            <span>In-App Notifications ({notifications.length})</span>
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No notifications yet.</p>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  notif.is_read
                    ? 'bg-gray-50 border-gray-100 text-gray-500'
                    : 'bg-orange-50/60 border-orange-200 text-gray-900 font-semibold'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{notif.title}</p>
                  <p className="text-xs mt-0.5">{notif.message}</p>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                {!notif.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
