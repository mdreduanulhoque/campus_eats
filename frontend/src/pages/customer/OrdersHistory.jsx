import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Utensils, 
  Award, 
  ShoppingBag,
  RotateCcw
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'accepted', label: 'Accepted by Kitchen' },
  { key: 'preparing', label: 'Preparing Food' },
  { key: 'ready', label: 'Ready for Pickup' },
  { key: 'picked_up', label: 'Picked Up & Paid' }
];

export const OrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const { liveEvent } = useSocket();
  const { reloadProfile } = useAuth();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      setOrders(res.data.data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh when live socket event occurs
  useEffect(() => {
    if (liveEvent && liveEvent.type === 'order_status_updated') {
      fetchOrders();
      reloadProfile();
    }
  }, [liveEvent]);

  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    setCancellingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'cancelled_by_user' });
      await fetchOrders();
      await reloadProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const activeOrders = orders.filter(
    (o) => !['picked_up', 'cancelled_by_user', 'failed_by_canteen', 'no_show'].includes(o.status)
  );

  const pastOrders = orders.filter((o) =>
    ['picked_up', 'cancelled_by_user', 'failed_by_canteen', 'no_show'].includes(o.status)
  );

  const getStepIndex = (status) => {
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Order Tracking</h1>
        <p className="text-xs text-gray-500">Track active kitchen preparation and pickup statuses in real-time</p>
      </div>

      {/* Active Orders Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          Active Preorders ({activeOrders.length})
        </h2>

        {loading ? (
          <div className="h-48 bg-gray-200 animate-pulse rounded-3xl" />
        ) : activeOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-600">No active orders right now</p>
            <p className="text-xs text-gray-400 mt-1">Preorder from the canteens to see live tracking here.</p>
          </div>
        ) : (
          activeOrders.map((order) => {
            const currentStepIdx = getStepIndex(order.status);
            const canCancel = order.status === 'pending' || order.status === 'accepted';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 sm:p-7 border border-orange-200 shadow-lg shadow-orange-500/5 space-y-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-md">
                        #{order.id}
                      </span>
                      <h3 className="font-extrabold text-base text-gray-900">{order.canteen_name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested Pickup:{' '}
                      <strong className="text-gray-800">
                        {new Date(order.requested_pickup_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-gray-400 font-semibold">Total to Pay</span>
                    <p className="text-lg font-black text-orange-600">{order.total_amount} BDT</p>
                  </div>
                </div>

                {/* Status Stepper Progression */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-0" />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 transition-all duration-500 -z-0"
                      style={{
                        width: `${Math.max(0, (currentStepIdx / (STATUS_STEPS.length - 2)) * 100)}%`
                      }}
                    />

                    {STATUS_STEPS.slice(0, 4).map((step, idx) => {
                      const isCompleted = currentStepIdx > idx;
                      const isCurrent = currentStepIdx === idx;

                      return (
                        <div key={step.key} className="flex flex-col items-center gap-1.5 z-10">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCompleted
                                ? 'bg-orange-500 text-white'
                                : isCurrent
                                ? 'bg-white border-2 border-orange-500 text-orange-600 shadow-md scale-110'
                                : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[9px] sm:text-[11px] font-bold text-center max-w-[70px] sm:max-w-[90px] leading-tight ${
                              isCurrent ? 'text-orange-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items in order */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
                  <p className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Ordered Items</p>
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between font-semibold text-gray-800">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{(item.quantity * item.price_at_time).toFixed(2)} BDT</span>
                    </div>
                  ))}
                  {order.points_redeemed > 0 && (
                    <div className="flex justify-between font-bold text-emerald-600 pt-1 border-t border-gray-200">
                      <span>Points Discount ({order.points_redeemed} pts)</span>
                      <span>-{(order.points_redeemed * 5).toFixed(2)} BDT</span>
                    </div>
                  )}
                </div>

                {/* Cancellation & Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {order.status === 'ready' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold w-full text-center animate-pulse">
                      🎉 Your food is hot and ready at the counter! Pay {order.total_amount} BDT cash upon pickup.
                    </div>
                  ) : canCancel ? (
                    <div className="flex items-center justify-between w-full">
                      <p className="text-[11px] text-gray-500">
                        You can cancel as long as kitchen hasn't started cooking.
                      </p>
                      <button
                        disabled={cancellingId === order.id}
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition-colors cursor-pointer"
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold w-full text-center">
                      🍳 Kitchen started cooking! Cancellation is now locked as food is being prepared.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Past Orders Section */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-gray-500" />
          Past Orders ({pastOrders.length})
        </h2>

        {pastOrders.length === 0 ? (
          <p className="text-xs text-gray-400">No past orders history.</p>
        ) : (
          <div className="space-y-3">
            {pastOrders.map((order) => {
              const isCompleted = order.status === 'picked_up';
              const isFailed = order.status === 'failed_by_canteen';
              const isNoShow = order.status === 'no_show';
              const isCancelled = order.status === 'cancelled_by_user';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{order.id}</span>
                      <span className="font-bold text-sm text-gray-900">{order.canteen_name}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isFailed
                            ? 'bg-amber-100 text-amber-800'
                            : isNoShow
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(order.created_at).toLocaleDateString()} at{' '}
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {order.points_earned > 0 && (
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>+{order.points_earned} pts</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Total Paid</span>
                      <p className="text-sm font-black text-gray-900">{order.total_amount} BDT</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
