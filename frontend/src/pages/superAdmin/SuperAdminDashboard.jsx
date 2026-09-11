import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Store, UserPlus, Plus, MapPin } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const [canteens, setCanteens] = useState([]);
  const [showCanteenModal, setShowCanteenModal] = useState(false);
  const [canteenForm, setCanteenForm] = useState({ name: '', location: '' });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedCanteenId, setSelectedCanteenId] = useState(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });

  const fetchCanteens = async () => {
    try {
      const res = await api.get('/canteens');
      setCanteens(res.data.data.canteens || []);
    } catch (err) {
      console.error('Failed to load canteens:', err);
    }
  };

  useEffect(() => {
    fetchCanteens();
  }, []);

  const handleCreateCanteen = async (e) => {
    e.preventDefault();
    try {
      await api.post('/canteens', canteenForm);
      setShowCanteenModal(false);
      setCanteenForm({ name: '', location: '' });
      await fetchCanteens();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create canteen.');
    }
  };

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/canteens/${selectedCanteenId}/local-admin`, adminForm);
      setShowAdminModal(false);
      setAdminForm({ name: '', email: '', password: '' });
      alert('Local Admin successfully provisioned and assigned!');
      await fetchCanteens();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign local admin.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Super Admin Portal</h1>
          <p className="text-xs text-gray-500">
            Provision university dining canteens and assign local canteen administrators.
          </p>
        </div>

        <button
          onClick={() => setShowCanteenModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Canteen</span>
        </button>
      </div>

      {/* Canteens Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {canteens.map((canteen) => (
          <div key={canteen.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                <Store className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                ID #{canteen.id}
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-gray-900">{canteen.name}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {canteen.location || 'Main Campus'}
              </p>
              <p className="text-xs font-bold text-purple-600 mt-2">
                {canteen.total_menu_items || 0} menu items registered
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedCanteenId(canteen.id);
                setShowAdminModal(true);
              }}
              className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign Local Admin</span>
            </button>
          </div>
        ))}
      </div>

      {/* Modal: Create Canteen */}
      {showCanteenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">Create Campus Canteen</h3>
            <form onSubmit={handleCreateCanteen} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Canteen Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Engineering Cafeteria"
                  value={canteenForm.name}
                  onChange={(e) => setCanteenForm({ ...canteenForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Campus Location</label>
                <input
                  type="text"
                  placeholder="e.g. Building C, 1st Floor"
                  value={canteenForm.location}
                  onChange={(e) => setCanteenForm({ ...canteenForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCanteenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Create Canteen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Local Admin */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900">Provision Local Admin</h3>
            <p className="text-xs text-gray-500">
              Create a manager account assigned specifically to Canteen #{selectedCanteenId}.
            </p>

            <form onSubmit={handleAssignAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Admin Name"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin.canteen@campuseats.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Assign Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
