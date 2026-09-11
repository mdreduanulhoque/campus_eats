import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Utensils, 
  DollarSign, 
  ToggleLeft, 
  ToggleRight,
  Flame,
  ChefHat,
  BellRing,
  Volume2,
  VolumeX
} from 'lucide-react';
import { playOrderChime } from '../../utils/audio';

export const KitchenBoard = () => {
  const { user } = useAuth();
  const { liveEvent } = useSocket();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'stock'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const canteenId = user?.canteen_id;

  const fetchCanteenData = async () => {
    if (!canteenId) return;
    try {
      const [ordersRes, menuRes] = await Promise.all([
        api.get(`/orders/canteen/${canteenId}`),
        api.get(`/canteens/${canteenId}/menu`)
      ]);
      setOrders(ordersRes.data.data.orders || []);
      setMenuItems(menuRes.data.data.items || []);
    } catch (err) {
      console.error('Error fetching kitchen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanteenData();
  }, [canteenId]);

  // Real-time auto-refresh on socket event
  useEffect(() => {
    if (liveEvent) {
      if (liveEvent.type === 'new_order' && soundEnabled) {
        playOrderChime();
      }
      fetchCanteenData();
    }
  }, [liveEvent]);

  const handleUpdateStatus = async (orderId, targetStatus) => {
    setActionLoading(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: targetStatus });
      await fetchCanteenData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStock = async (itemId, currentAvailability) => {
    try {
      await api.patch(`/menu/${itemId}/availability`, { is_available: !currentAvailability });
      setMenuItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, is_available: !currentAvailability } : i))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle item availability.');
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const inProgressOrders = orders.filter((o) => o.status === 'accepted' || o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const completedOrders = orders.filter((o) =>
    ['picked_up', 'cancelled_by_user', 'failed_by_canteen', 'no_show'].includes(o.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900">Kitchen Operations Board</h1>
              <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-black rounded-full uppercase">
                Live
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Assigned Canteen ID: <strong>{canteenId || 'Unassigned'}</strong>
            </p>
          </div>
        </div>

        {/* Controls & Tab switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-orange-50 border-orange-200 text-orange-700'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
            title={soundEnabled ? 'Chime Enabled' : 'Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>

          <div className="flex bg-gray-100 p-1 rounded-xl gap-1 self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'orders' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Orders Board ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'stock' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Menu Stock ({menuItems.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Incoming & Pending */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-500" />
                Incoming ({pendingOrders.length})
              </h2>
            </div>

            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        #{order.id}
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-1">{order.user_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold">Pickup Time</span>
                      <p className="text-xs font-black text-gray-800">
                        {new Date(order.requested_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 p-2.5 rounded-xl space-y-1 text-xs">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-gray-800 font-semibold">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Accept Order
                    </button>
                    <button
                      disabled={actionLoading === order.id}
                      onClick={() => handleUpdateStatus(order.id, 'failed_by_canteen')}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors cursor-pointer"
                      title="Mark Unfulfillable (+3 compensation points to user)"
                    >
                      Fail
                    </button>
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No incoming orders</p>
              )}
            </div>
          </div>

          {/* Column 2: In Progress (Accepted & Preparing) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-orange-500">
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                In Kitchen ({inProgressOrders.length})
              </h2>
            </div>

            <div className="space-y-3">
              {inProgressOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-orange-200 shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                        #{order.id}
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-1">{order.user_name}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      {order.status}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 p-2.5 rounded-xl space-y-1 text-xs">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-gray-800 font-semibold">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {order.status === 'accepted' ? (
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Start Preparing (Locks Cancel)
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Mark Ready for Pickup
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {inProgressOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No orders cooking</p>
              )}
            </div>
          </div>

          {/* Column 3: Ready for Pickup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Ready for Pickup ({readyOrders.length})
              </h2>
            </div>

            <div className="space-y-3">
              {readyOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        #{order.id}
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-1">{order.user_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold">Cash to Collect</span>
                      <p className="text-sm font-black text-emerald-700">{order.total_amount} BDT</p>
                    </div>
                  </div>

                  <button
                    disabled={actionLoading === order.id}
                    onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Confirm Cash & Hand Over Food
                  </button>
                </div>
              ))}
              {readyOrders.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">No orders awaiting pickup</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Stock Availability Quick Toggle Tab */
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Live Stock Availability</h2>
            <p className="text-xs text-gray-500">
              Toggle items OFF when ingredients run out. Customers will immediately see items as 'Out of Stock'.
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {menuItems.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.price} BDT • ~{item.est_prep_time_mins} mins prep</p>
                </div>

                <button
                  onClick={() => handleToggleStock(item.id, item.is_available)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    item.is_available
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {item.is_available ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                      <span>In Stock (Available)</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-red-600" />
                      <span>Out of Stock</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
