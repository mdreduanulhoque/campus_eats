import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Store, MapPin, UtensilsCrossed, ShieldAlert, Search, ArrowRight } from 'lucide-react';

export const CanteenList = () => {
  const { user } = useAuth();
  const [canteens, setCanteens] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const res = await api.get('/canteens');
        setCanteens(res.data.data.canteens || []);
      } catch (err) {
        console.error('Failed to load canteens:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCanteens();
  }, []);

  const filteredCanteens = canteens.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12 space-y-6">
      {/* Blocked User Banner */}
      {user?.is_blocked && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-md animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-red-900">
              Account Suspended: 3 Penalty Strikes
            </h3>
            <p className="text-xs sm:text-sm text-red-700 mt-1">
              Your account has been blocked due to repeated no-shows at the food counter. You cannot place new orders until unblocked.
              <br />
              <strong className="underline decoration-red-400">Please visit the Local Admin at the canteen office to unblock your account.</strong>
            </p>
          </div>
        </div>
      )}

      {/* Hero / Banner */}
      <div className="bg-linear-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10">
        <div className="max-w-xl">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
            Campus Dining Reimagined
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-3 tracking-tight">
            Skip the counter rush. Order ahead.
          </h1>
          <p className="text-sm sm:text-base text-orange-50/90 mt-2 font-medium">
            Preorder fresh hot meals from your favorite campus cafeterias and pick up right on time.
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Campus Canteens</h2>
          <p className="text-xs text-gray-500">Select a canteen to view current live menu</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search canteens or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Canteens Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gray-200 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredCanteens.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">No canteens found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCanteens.map((canteen) => (
            <Link
              key={canteen.id}
              to={`/canteen/${canteen.id}`}
              className="group bg-white rounded-3xl p-5 border border-gray-100 shadow-xs hover:shadow-xl hover:border-orange-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                    {canteen.total_menu_items || 0} items
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-gray-900 mt-4 group-hover:text-orange-600 transition-colors">
                  {canteen.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {canteen.location || 'Campus Center'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-orange-600">
                <span>View Live Menu</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
