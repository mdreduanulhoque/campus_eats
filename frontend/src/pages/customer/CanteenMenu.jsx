import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';
import { Store, MapPin, Clock, Plus, ShoppingBag, ArrowLeft, Search, ArrowLeftRight, Check } from 'lucide-react';

export const CanteenMenu = ({ onOpenCart }) => {
  const { id } = useParams();
  const { addItem, totalItemCount } = useCart();
  const { user } = useAuth();
  const { toggleCompare, isInCompare } = useCompare();

  const [canteen, setCanteen] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [canteenRes, menuRes] = await Promise.all([
          api.get(`/canteens/${id}`),
          api.get(`/canteens/${id}/menu`)
        ]);
        setCanteen(canteenRes.data.data.canteen);
        setMenuItems(menuRes.data.data.items || []);
      } catch (err) {
        console.error('Error fetching canteen menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-12 space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campus Menu
      </Link>

      {/* Canteen Header Info */}
      {canteen && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 mb-1">
              <Store className="w-4 h-4" />
              <span>Campus Dining Partner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {canteen.name}
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {canteen.location || 'Campus Center'}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      )}

      {/* Menu Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8">
          <p className="text-sm font-bold text-gray-600">No dishes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                item.is_available
                  ? 'border-gray-100 shadow-xs hover:shadow-lg hover:border-orange-200'
                  : 'border-gray-200 opacity-60 bg-gray-50/50'
              }`}
            >
              {/* Image Banner */}
              <div className="h-44 w-full bg-gray-100 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Store className="w-12 h-12" />
                  </div>
                )}

                {/* Prep time badge */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  <span>~{item.est_prep_time_mins || 10} mins</span>
                </div>

                {/* Stock status pill */}
                {!item.is_available && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Sold Out
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">Price</span>
                    <p className="text-lg font-black text-gray-900 leading-none mt-0.5">
                      {item.price} <span className="text-xs font-bold text-gray-500">BDT</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleCompare(item, canteen)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isInCompare(item.id)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50'
                      }`}
                      title={isInCompare(item.id) ? 'Remove from compare' : 'Compare with another dish'}
                    >
                      {isInCompare(item.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span className="hidden sm:inline text-[11px]">Added</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Compare</span>
                        </>
                      )}
                    </button>

                    <button
                      disabled={!item.is_available || Boolean(user?.is_blocked)}
                      onClick={() => addItem(item, canteen)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{item.is_available ? 'Add to Cart' : 'Out of Stock'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Floating Cart Button */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-2xl shadow-orange-500/40 cursor-pointer animate-bounce-short"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm">View Cart ({totalItemCount})</span>
          </button>
        </div>
      )}
    </div>
  );
};
