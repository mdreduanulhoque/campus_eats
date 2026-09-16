import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';
import { 
  Store, 
  MapPin, 
  Clock, 
  Plus, 
  ShoppingBag, 
  ArrowLeft, 
  Search, 
  ArrowLeftRight, 
  Check, 
  Star,
  SlidersHorizontal,
  ArrowUpDown,
  X
} from 'lucide-react';
import { ItemReviewsModal } from '../../components/customer/ItemReviewsModal';

export const CanteenMenu = ({ onOpenCart }) => {
  const { id } = useParams();
  const { addItem, totalItemCount } = useCart();
  const { user } = useAuth();
  const { toggleCompare, isInCompare } = useCompare();

  const [canteen, setCanteen] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // 'price_rating_asc' | 'price_asc' | 'price_desc' | 'rating_desc' | 'rating_asc' | 'default'
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [onlyWithReviews, setOnlyWithReviews] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedItemForReviews, setSelectedItemForReviews] = useState(null);

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

  // When a search is entered, default sort automatically switches to 'price_rating_asc'
  const activeSort = sortBy !== 'default' ? sortBy : (searchTerm.trim() ? 'price_rating_asc' : 'default');

  const filteredItems = menuItems
    .filter((item) => {
      // Matches titles (names) and descriptions (case-insensitive)
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term))
      );

      // Price filter
      const price = parseFloat(item.price);
      const matchesPrice = !maxPrice || isNaN(parseFloat(maxPrice)) || price <= parseFloat(maxPrice);

      // Review / Rating filter
      const rating = parseFloat(item.avg_rating || 0);
      const reviews = parseInt(item.review_count || 0, 10);
      const matchesRating = !minRating || isNaN(parseFloat(minRating)) || rating >= parseFloat(minRating);
      const matchesOnlyReviews = !onlyWithReviews || reviews > 0;

      return matchesSearch && matchesPrice && matchesRating && matchesOnlyReviews;
    })
    .sort((a, b) => {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      const ratingA = parseFloat(a.avg_rating) || 0;
      const ratingB = parseFloat(b.avg_rating) || 0;

      if (activeSort === 'price_rating_asc') {
        // Sort in ascending order based on price and rating
        if (priceA !== priceB) return priceA - priceB;
        return ratingA - ratingB;
      }
      if (activeSort === 'price_asc') {
        return priceA - priceB;
      }
      if (activeSort === 'price_desc') {
        return priceB - priceA;
      }
      if (activeSort === 'rating_desc') {
        if (ratingB !== ratingA) return ratingB - ratingA;
        return priceA - priceB;
      }
      if (activeSort === 'rating_asc') {
        if (ratingA !== ratingB) return ratingA - ratingB;
        return priceA - priceB;
      }
      // Default: Dish name
      return (a.name || '').localeCompare(b.name || '');
    });

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
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                canteen.is_open ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {canteen.is_open ? 'Kitchen Open' : 'Kitchen Closed'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {canteen.name}
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {canteen.location || 'Campus Center'}
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showFilters || maxPrice || minRating || onlyWithReviews || (sortBy !== 'default' && sortBy !== 'price_rating_asc')
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              title="Filters and sorting"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(maxPrice || minRating || onlyWithReviews) && (
                <span className="w-2 h-2 rounded-full bg-white"></span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter & Sort Controls Panel */}
      {(showFilters || searchTerm || maxPrice || minRating || onlyWithReviews) && (
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Sort By Dropdown */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                Sort:
              </span>
              <select
                value={activeSort}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer text-gray-800"
              >
                <option value="price_rating_asc">Price & Rating: Low to High (Default)</option>
                <option value="price_asc">Price: Lowest to Highest</option>
                <option value="price_desc">Price: Highest to Lowest</option>
                <option value="rating_desc">Rating: Highest First</option>
                <option value="rating_asc">Rating: Lowest First</option>
                <option value="default">Default (Dish Name)</option>
              </select>
            </div>

            {/* Price Filter Options */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-700">Max Price:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'Any', val: '' },
                  { label: '≤ 35', val: '35' },
                  { label: '≤ 60', val: '60' },
                  { label: '≤ 100', val: '100' }
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setMaxPrice(maxPrice === p.val ? '' : p.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      maxPrice === p.val
                        ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label} {p.val && <span className="text-[10px]">BDT</span>}
                  </button>
                ))}
                <div className="relative w-20 ml-1">
                  <input
                    type="number"
                    placeholder="Custom"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Review / Rating Filter Options */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-700 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Review:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: 'All', val: '' },
                  { label: '4★+', val: '4' },
                  { label: '3★+', val: '3' }
                ].map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setMinRating(minRating === r.val ? '' : r.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      minRating === r.val
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  onClick={() => setOnlyWithReviews(!onlyWithReviews)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ml-1 ${
                    onlyWithReviews
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Reviewed
                </button>
              </div>
            </div>

            {/* Reset All Filters button */}
            {(searchTerm || maxPrice || minRating || onlyWithReviews || (sortBy !== 'default' && sortBy !== 'price_rating_asc')) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMaxPrice('');
                  setMinRating('');
                  setOnlyWithReviews(false);
                  setSortBy('default');
                }}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Live Search and Sort status notice */}
          {searchTerm.trim() && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600 pt-2 border-t border-gray-100 flex-wrap">
              <span>
                Showing results matching <strong>"{searchTerm}"</strong> in titles & descriptions
              </span>
              <span className="font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 text-[10px]">
                Sorted: {activeSort === 'price_rating_asc' ? 'Price (Asc) & Rating (Asc)' : activeSort}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Kitchen Closed Alert Banner */}
      {canteen && !canteen.is_open && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <Store className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-extrabold text-rose-950">Kitchen is Currently Closed</h2>
            <p className="text-xs text-rose-700 mt-0.5">
              This canteen is not accepting orders at this time. All dishes are disabled until the local admin reopens the kitchen.
            </p>
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
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900 leading-snug flex-1">{item.name}</h3>
                    <button
                      onClick={() =>
                        setSelectedItemForReviews({
                          ...item,
                          canteen_name: canteen?.name
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[11px] font-black shrink-0 transition-colors cursor-pointer"
                      title={
                        item.review_count > 0
                          ? `Rating: ${Number(item.avg_rating).toFixed(1)} (${item.review_count} reviews) - Click to view`
                          : 'No reviews yet - Click to view'
                      }
                    >
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{item.review_count > 0 ? Number(item.avg_rating).toFixed(1) : 'New'}</span>
                      {item.review_count > 0 && (
                        <span className="text-[10px] text-amber-700 font-semibold">
                          ({item.review_count})
                        </span>
                      )}
                    </button>
                  </div>
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
                      disabled={!item.is_available || !canteen?.is_open || Boolean(user?.is_blocked)}
                      onClick={() => addItem(item, canteen)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{!canteen?.is_open ? 'Kitchen Closed' : item.is_available ? 'Add to Cart' : 'Out of Stock'}</span>
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

      {/* Item Reviews Modal */}
      <ItemReviewsModal
        isOpen={Boolean(selectedItemForReviews)}
        onClose={() => setSelectedItemForReviews(null)}
        item={selectedItemForReviews}
      />
    </div>
  );
};
