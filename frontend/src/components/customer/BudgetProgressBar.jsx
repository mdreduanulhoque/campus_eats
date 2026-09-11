import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const BudgetProgressBar = ({ currentCartTotal = 0 }) => {
  const { user } = useAuth();
  const [todaySpent, setTodaySpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpent = async () => {
      try {
        const res = await api.get('/orders/my-orders');
        const orders = res.data.data.orders || [];
        const today = new Date().toISOString().slice(0, 10);

        const spent = orders
          .filter(
            (o) =>
              o.created_at.slice(0, 10) === today &&
              o.status !== 'cancelled_by_user' &&
              o.status !== 'failed_by_canteen'
          )
          .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

        setTodaySpent(spent);
      } catch (err) {
        console.error('Failed to compute daily spent:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpent();
  }, [user]);

  const budgetLimit = parseFloat(user?.daily_budget_limit || 0);

  if (budgetLimit === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-700">
        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
        <span>No daily budget limit set. You can set one in your Profile to control spending.</span>
      </div>
    );
  }

  const projectedTotal = todaySpent + currentCartTotal;
  const percentage = Math.min(100, Math.round((projectedTotal / budgetLimit) * 100));
  const isOverBudget = projectedTotal > budgetLimit;
  const isNearBudget = !isOverBudget && percentage >= 80;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isOverBudget
        ? 'bg-red-50 border-red-200 text-red-900'
        : isNearBudget
        ? 'bg-amber-50 border-amber-200 text-amber-900'
        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
    }`}>
      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
        <span className="flex items-center gap-1.5">
          {isOverBudget ? (
            <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
          ) : isNearBudget ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          Daily Budget Status
        </span>
        <span>
          {projectedTotal.toFixed(0)} / {budgetLimit.toFixed(0)} BDT ({percentage}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverBudget ? 'bg-red-500' : isNearBudget ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isOverBudget && (
        <p className="text-[11px] font-bold text-red-700 mt-2">
          ⚠️ Checkout blocked: This order exceeds your remaining daily budget by {(projectedTotal - budgetLimit).toFixed(0)} BDT.
        </p>
      )}
    </div>
  );
};
