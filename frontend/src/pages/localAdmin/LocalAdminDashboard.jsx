import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Utensils, 
  Users, 
  BarChart3, 
  ShieldAlert, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react';

export const LocalAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'staff' | 'analytics' | 'penalties'
  const canteenId = user?.canteen_id;

  // Data states
  const [menuItems, setMenuItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [penalizedUsers, setPenalizedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form states
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    est_prep_time_mins: 10,
    image_url: ''
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const fetchData = async () => {
    if (!canteenId) return;
    try {
      const [menuRes, staffRes, analyticsRes, penaltiesRes] = await Promise.all([
        api.get(`/canteens/${canteenId}/menu`),
        api.get(`/canteens/${canteenId}/staff`),
        api.get(`/admin/analytics/${canteenId}`),
        api.get(`/admin/users/penalized`)
      ]);
      setMenuItems(menuRes.data.data.items || []);
      setStaff(staffRes.data.data.staff || []);
      setAnalytics(analyticsRes.data.data);
      setPenalizedUsers(penaltiesRes.data.data.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canteenId]);

  // Handle Menu Save
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, itemForm);
      } else {
        await api.post('/menu', { ...itemForm, canteen_id: canteenId });
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: '', est_prep_time_mins: 10, image_url: '' });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save menu item.');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/menu/${itemId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  // Handle Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/canteens/${canteenId}/staff`, staffForm);
      setShowStaffModal(false);
      setStaffForm({ name: '', email: '', password: '' });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create kitchen staff account.');
    }
  };

  // Handle Unblock User
  const handleUnblockUser = async (targetUserId) => {
    try {
      await api.patch(`/admin/users/${targetUserId}/unblock`);
      alert('User has been successfully unblocked!');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Canteen Admin Portal</h1>
          <p className="text-xs text-gray-500">
            Manage your canteen menu, assign staff, view peak sales hours, and unblock penalized students.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'menu' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Menu Items ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sales Analytics
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'staff' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Kitchen Staff ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('penalties')}
            className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'penalties' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Penalties & Unblock ({penalizedUsers.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Menu Items CRUD */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Canteen Menu Catalog</h2>
              <p className="text-xs text-gray-500">Add and update dishes available to students</p>
            </div>
            <button
              onClick={() => {
                setEditingItem(null);
                setItemForm({ name: '', description: '', price: '', est_prep_time_mins: 10, image_url: '' });
                setShowItemModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {menuItems.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils className="w-6 h-6 text-gray-400 m-auto mt-3" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.price} BDT • ~{item.est_prep_time_mins} mins prep</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setItemForm({
                        name: item.name,
                        description: item.description || '',
                        price: item.price,
                        est_prep_time_mins: item.est_prep_time_mins || 10,
                        image_url: item.image_url || ''
                      });
                      setShowItemModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Sales Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Total Sales Revenue</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {analytics.overview?.total_revenue?.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-bold text-gray-400">BDT</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">From completed orders</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Completed Orders</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {analytics.overview?.total_completed_orders || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Successfully picked up</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Peak Time Distribution</span>
              </div>
              <p className="text-sm font-bold text-gray-800">
                {analytics.peak_hours?.length > 0
                  ? `${analytics.peak_hours[0].pickup_hour}:00 - ${analytics.peak_hours[0].pickup_hour + 1}:00`
                  : 'Data collecting'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Busiest pickup window</p>
            </div>
          </div>

          {/* Top Selling Items & Peak Hours Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-gray-900">Top Selling Items</h3>
              <div className="divide-y divide-gray-100">
                {analytics.top_items?.map((ti) => (
                  <div key={ti.id} className="py-2.5 flex justify-between text-xs">
                    <span className="font-bold text-gray-800">{ti.name}</span>
                    <span className="font-semibold text-gray-500">
                      {ti.total_quantity_sold} sold • {ti.total_sales} BDT
                    </span>
                  </div>
                ))}
                {(!analytics.top_items || analytics.top_items.length === 0) && (
                  <p className="text-xs text-gray-400 py-4 text-center">No sales recorded yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm text-gray-900">Pickup Volume by Hour</h3>
              <div className="space-y-2">
                {analytics.peak_hours?.map((ph) => (
                  <div key={ph.pickup_hour} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 w-16">
                      {ph.pickup_hour}:00
                    </span>
                    <div className="flex-1 mx-3 bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, ph.order_count * 20)}%` }}
                      />
                    </div>
                    <span className="font-black text-gray-900">{ph.order_count} orders</span>
                  </div>
                ))}
                {(!analytics.peak_hours || analytics.peak_hours.length === 0) && (
                  <p className="text-xs text-gray-400 py-4 text-center">No orders recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Kitchen Staff Management */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Kitchen Staff Accounts</h2>
              <p className="text-xs text-gray-500">Accounts authorized to operate the order board for this canteen</p>
            </div>
            <button
              onClick={() => setShowStaffModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Kitchen Staff</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {staff.map((s) => (
              <div key={s.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-full uppercase">
                  {s.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Penalties & Unblock Management */}
      {activeTab === 'penalties' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Penalized & Blocked Users</h2>
            <p className="text-xs text-gray-500">
              Users who failed to pick up ready meals within 30 minutes accrue penalty strikes. At 3 strikes, ordering is suspended.
            </p>
          </div>

          {penalizedUsers.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">No students currently have penalty strikes.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {penalizedUsers.map((u) => (
                <div key={u.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">{u.name}</h3>
                      {u.is_blocked ? (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-full uppercase">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                          {u.penalty_flags}/3 Strikes
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </div>

                  <button
                    onClick={() => handleUnblockUser(u.id)}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 cursor-pointer transition-colors"
                  >
                    Unblock & Clear Strikes
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add/Edit Menu Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">
              {editingItem ? 'Edit Dish Details' : 'Add New Dish'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price (BDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    required
                    value={itemForm.est_prep_time_mins}
                    onChange={(e) => setItemForm({ ...itemForm, est_prep_time_mins: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Staff */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">Register Kitchen Staff</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Staff Email</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
