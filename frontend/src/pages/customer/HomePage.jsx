import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { BudgetProgressBar } from '../../components/customer/BudgetProgressBar';
import { 
  Search, 
  Store, 
  Clock, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ShieldAlert, 
  Sparkles, 
  Utensils, 
  MapPin, 
  ChevronRight,
  Filter
} from 'lucide-react';

export const HomePage = ({ onOpenCart }) => {
  const { user } = useAuth();
  const { cart, addItem, updateQuantity, totalItemCount } = useCart();

  const [items, setItems] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCanteenId, setSelectedCanteenId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch canteens first
      const canteensRes = await api.get('/canteens');
      const fetchedCanteens = canteensRes.data?.data?.canteens || [];
      setCanteens(fetchedCanteens);

      // Try single batch menu endpoint
      let loadedItems = [];
      try {
        const menuRes = await api.get('/menu');
        if (menuRes.data?.data?.items && menuRes.data.data.items.length > 0) {
          loadedItems = menuRes.data.data.items;
        }
      } catch (menuErr) {
        console.warn('/api/menu returned error, falling back to per-canteen fetch:', menuErr?.message);
      }

      // If batch menu was unavailable or empty, fall back to per-canteen menu endpoints
      if (loadedItems.length === 0 && fetchedCanteens.length > 0) {
        const menuPromises = fetchedCanteens.map(async (c) => {
          try {
            const res = await api.get(`/canteens/${c.id}/menu`);
            const itemsList = res.data?.data?.items || [];
            return itemsList.map((i) => ({
              ...i,
              canteen_name: c.name,
              canteen_location: c.location
            }));
          } catch {
            return [];
          }
        });
        const allResults = await Promise.all(menuPromises);
        loadedItems = allResults.flat();
      }

      setItems(loadedItems);
    } catch (err) {
      console.error('Error fetching home feed:', err);
      setError('Failed to load menu items. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items by selected canteen and search term
  const filteredItems = items.filter((item) => {
    const matchesCanteen = selectedCanteenId ? item.canteen_id === selectedCanteenId : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.canteen_name && item.canteen_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCanteen && matchesSearch;
  });

  const getItemQuantityInCart = (itemId) => {
    const found = cart.items.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12 space-y-6">
      {/* Blocked User Warning (Only for authenticated blocked students) */}
      {Boolean(user?.is_blocked) && (
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

      {/* Daily Budget Status Bar (Only for logged in students) */}
      {user?.role === 'user' && !Boolean(user?.is_blocked) && (
        <BudgetProgressBar />
      )}

      {/* Hero / Banner */}
      <div className="bg-orange-500 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="max-w-xl relative z-10">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-white inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Campus Dining Reimagined
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-3 tracking-tight text-white">
            Skip the counter rush. Order ahead.
          </h1>
          <p className="text-sm sm:text-base text-orange-100 mt-2 font-medium">
            Explore live food items across all campus cafeterias. Browse freely without an account — sign in only when you're ready to preorder!
          </p>
        </div>
        <div className="absolute -right-6 -bottom-10 opacity-15 pointer-events-none">
          <Utensils className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Search Bar & Canteen Quick Select Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>Today's Campus Menu</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
            <p className="text-xs text-gray-500">Pick delicious dishes prepared fresh by campus canteens</p>
          </div>

          {/* Search Input */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, ingredients, or canteens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Canteen Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          <button
            onClick={() => setSelectedCanteenId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
              selectedCanteenId === null
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Canteens ({items.length})
          </button>
          {canteens.map((canteen) => {
            const count = items.filter((i) => i.canteen_id === canteen.id).length;
            const isSelected = selectedCanteenId === canteen.id;
            return (
              <button
                key={canteen.id}
                onClick={() => setSelectedCanteenId(isSelected ? null : canteen.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>{canteen.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
              <div className="h-6 bg-gray-100 rounded-lg w-1/2"></div>
              <div className="h-40 bg-gray-100 rounded-xl"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              <div className="h-8 bg-gray-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <p className="text-red-500 font-bold text-sm">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
          <Utensils className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-700">No items match your criteria</h3>
          <p className="text-xs text-gray-400">
            Try adjusting your search query or selecting a different canteen filter.
          </p>
          {(searchTerm || selectedCanteenId) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCanteenId(null);
              }}
              className="mt-2 text-xs font-bold text-orange-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const qtyInCart = getItemQuantityInCart(item.id);
            const isAvailable = Boolean(item.is_available);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 group ${
                  isAvailable
                    ? 'border-gray-100 shadow-xs hover:shadow-lg hover:border-orange-200'
                    : 'border-gray-200 opacity-60 bg-gray-50/50'
                }`}
              >
                {/* Canteen Tag Header on Top of the Card */}
                <div className="px-4 py-2.5 bg-orange-50/60 border-b border-orange-100/70 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-xs font-extrabold text-orange-950 truncate tracking-tight">
                      {item.canteen_name}
                    </span>
                  </div>
                  <Link
                    to={`/canteen/${item.canteen_id}`}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0 flex items-center"
                    title={`View ${item.canteen_name} menu`}
                  >
                    <span>View Menu</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Dish Image Banner */}
                <div className="h-44 w-full bg-gray-100 relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/50 text-orange-400">
                      <Utensils className="w-10 h-10 mb-1 opacity-70" />
                      <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">
                        Campus Fresh
                      </span>
                    </div>
                  )}

                  {/* Preparation time badge */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>~{item.est_prep_time_mins || 10} mins</span>
                  </div>

                  {/* Stock status indicator */}
                  {!isAvailable && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                      Sold Out
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-orange-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description || 'Delicious meal freshly prepared upon order.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Price</span>
                      <p className="text-lg font-black text-gray-900 leading-none mt-0.5">
                        {item.price} <span className="text-xs font-bold text-gray-500">BDT</span>
                      </p>
                    </div>

                    {/* Cart Action Buttons */}
                    {qtyInCart > 0 ? (
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, qtyInCart - 1)}
                          className="w-6 h-6 rounded-lg bg-white text-orange-600 flex items-center justify-center hover:bg-orange-100 font-black cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-orange-950 px-1">
                          {qtyInCart}
                        </span>
                        <button
                          disabled={!isAvailable}
                          onClick={() => updateQuantity(item.id, qtyInCart + 1)}
                          className="w-6 h-6 rounded-lg bg-white text-orange-600 flex items-center justify-center hover:bg-orange-100 font-black cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={!isAvailable || Boolean(user?.is_blocked)}
                        onClick={() =>
                          addItem(item, {
                            id: item.canteen_id,
                            name: item.canteen_name
                          })
                        }
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAvailable ? 'Add to Cart' : 'Out of Stock'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Cart Trigger for Mobile & Quick Desktop Glance */}
      {totalItemCount > 0 && (
        <button
          onClick={onOpenCart}
          className="fixed bottom-16 sm:bottom-6 right-6 z-30 flex items-center gap-2.5 px-5 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full shadow-2xl shadow-orange-500/40 cursor-pointer animate-bounce-short"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-sm">View Tray ({totalItemCount})</span>
        </button>
      )}
    </div>
  );
};

export default HomePage;
