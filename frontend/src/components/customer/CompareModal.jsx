import React, { useState, useEffect } from 'react';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ItemPickerModal } from './ItemPickerModal';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  X, 
  ArrowLeftRight, 
  Trash2, 
  Store, 
  MapPin, 
  Clock, 
  Check, 
  Plus, 
  Utensils, 
  AlertCircle, 
  Sparkles,
  TrendingDown,
  Zap,
  ExternalLink
} from 'lucide-react';

export const CompareModal = ({ isOpen, onClose }) => {
  const { 
    comparedItems, 
    removeFromCompare, 
    clearCompare, 
    swapItems, 
    setItemAtSlot,
    closeCompareModal 
  } = useCompare();

  const { addItem } = useCart();
  const { user } = useAuth();

  const [pickerSlot, setPickerSlot] = useState(null); // null, 0, or 1
  const [backendMetrics, setBackendMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const activeClose = onClose || closeCompareModal;

  const item1 = comparedItems[0] || null;
  const item2 = comparedItems[1] || null;

  // When 2 items exist, query the backend /api/menu/compare to sync authoritative server metrics
  useEffect(() => {
    if (!item1 || !item2) {
      setBackendMetrics(null);
      return;
    }

    const fetchComparison = async () => {
      setLoadingMetrics(true);
      try {
        const res = await api.get(`/menu/compare?item1=${item1.id}&item2=${item2.id}`);
        if (res.data?.data?.metrics) {
          setBackendMetrics(res.data.data.metrics);
        }
      } catch (err) {
        // Fallback to local computation if offline or error
        console.warn('Backend compare endpoint returned error, using client-side metrics:', err?.message);
        setBackendMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchComparison();
  }, [item1?.id, item2?.id]);

  if (!isOpen) return null;

  // Client-side computed metrics as primary/fallback
  const price1 = item1 ? parseFloat(item1.price) : 0;
  const price2 = item2 ? parseFloat(item2.price) : 0;
  const priceDiff = Math.abs(price1 - price2);
  const cheaperItem = item1 && item2
    ? price1 < price2 ? item1 : price2 < price1 ? item2 : null
    : null;
  const cheaperPercent = item1 && item2 && cheaperItem
    ? Math.round((priceDiff / Math.max(price1, price2)) * 100)
    : 0;

  const prep1 = item1 ? (item1.est_prep_time_mins || 10) : 0;
  const prep2 = item2 ? (item2.est_prep_time_mins || 10) : 0;
  const prepDiff = Math.abs(prep1 - prep2);
  const fasterItem = item1 && item2
    ? prep1 < prep2 ? item1 : prep2 < prep1 ? item2 : null
    : null;

  const sameCanteen = item1 && item2 && (item1.canteen_id === item2.canteen_id);

  const handlePickSelect = (dish) => {
    if (pickerSlot !== null) {
      setItemAtSlot(pickerSlot, dish, { id: dish.canteen_id, name: dish.canteen_name, location: dish.canteen_location });
    }
  };

  const handleAddToCart = (item) => {
    addItem(item, {
      id: item.canteen_id,
      name: item.canteen_name
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-4xl w-full my-auto flex flex-col shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] animate-scale-in">
          
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/80 via-white to-orange-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Cross-Canteen Food Comparison</span>
                  {item1 && item2 && !sameCanteen && (
                    <span className="hidden sm:inline-block text-[10px] uppercase font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Cross-Canteen
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500">
                  Compare pricing, preparation time, availability, and canteen locations side-by-side
                </p>
              </div>
            </div>

            {/* Top action controls */}
            <div className="flex items-center gap-2">
              {item1 && item2 && (
                <button
                  onClick={swapItems}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Swap positions"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-orange-600" />
                  <span className="hidden sm:inline">Swap Sides</span>
                </button>
              )}

              {comparedItems.length > 0 && (
                <button
                  onClick={clearCompare}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              <button
                onClick={activeClose}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Comparison Summary Pill (When 2 items are selected) */}
          {item1 && item2 && (
            <div className="bg-orange-500/10 px-4 py-2.5 border-b border-orange-100 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
              <div className="flex items-center gap-2 text-orange-950">
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                  Verdict
                </span>
                <span>
                  {cheaperItem ? (
                    <>
                      <strong className="text-orange-900">{cheaperItem.name}</strong> is{' '}
                      <strong className="text-emerald-700">৳{priceDiff} cheaper ({cheaperPercent}% less)</strong>.
                    </>
                  ) : (
                    'Both dishes have the exact same price.'
                  )}
                  {fasterItem ? (
                    <>
                      {' '}Also, <strong className="text-orange-900">{fasterItem.name}</strong> is{' '}
                      <strong className="text-blue-700">{prepDiff} mins faster to prepare</strong>.
                    </>
                  ) : (
                    ' Both dishes take the same time (~10m).'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Main Comparison Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              
              {/* Center VS Indicator on Desktop */}
              <div className="hidden md:flex absolute left-1/2 top-28 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-orange-500 text-white font-black text-xs items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                VS
              </div>

              {/* Column 1 */}
              <div className="flex flex-col">
                {item1 ? (
                  <div className="bg-white rounded-2xl border-2 border-orange-200/80 shadow-xs flex-1 flex flex-col overflow-hidden">
                    {/* Dish Image Banner */}
                    <div className="h-44 w-full bg-gray-100 relative overflow-hidden group">
                      {item1.image_url ? (
                        <img src={item1.image_url} alt={item1.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                          <Utensils className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-[10px] font-bold uppercase">Campus Item</span>
                        </div>
                      )}

                      {/* Cheaper Badge Overlay */}
                      {cheaperItem && cheaperItem.id === item1.id && (
                        <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md animate-pulse">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Save ৳{priceDiff}</span>
                        </div>
                      )}

                      {/* Faster Badge Overlay */}
                      {fasterItem && fasterItem.id === item1.id && (
                        <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md">
                          <Zap className="w-3.5 h-3.5" />
                          <span>{prepDiff}m Faster</span>
                        </div>
                      )}

                      {/* Change Dish Button */}
                      <button
                        onClick={() => setPickerSlot(0)}
                        className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded-xl text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
                      >
                        Change Dish
                      </button>
                    </div>

                    {/* Dish Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Canteen Tag */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                            <Store className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item1.canteen_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium truncate">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{item1.canteen_location}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-gray-900 leading-snug">
                          {item1.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">
                          {item1.description || 'Delicious meal freshly made to order.'}
                        </p>
                      </div>

                      {/* Metrics Comparison Matrix */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Price:</span>
                          <span className="text-base font-black text-gray-900">
                            ৳{item1.price}{' '}
                            {cheaperItem && cheaperItem.id === item1.id && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                                Lowest Price
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Prep Time:</span>
                          <span className="font-extrabold text-gray-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            ~{item1.est_prep_time_mins || 10} mins
                            {fasterItem && fasterItem.id === item1.id && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">
                                Faster
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Student Rating:</span>
                          <span className="font-extrabold text-amber-900 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {item1.review_count > 0 ? (
                              <>
                                <span>{Number(item1.avg_rating).toFixed(1)} / 5</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  ({item1.review_count} revs)
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 font-normal">No reviews yet</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Stock Status:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            item1.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item1.is_available ? 'Available' : 'Sold Out'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          disabled={!item1.is_available || Boolean(user?.is_blocked)}
                          onClick={() => handleAddToCart(item1)}
                          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{item1.is_available ? `Add ${item1.name} to Cart` : 'Out of Stock'}</span>
                        </button>

                        <Link
                          to={`/canteen/${item1.canteen_id}`}
                          onClick={activeClose}
                          className="text-center text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center justify-center gap-1"
                        >
                          <span>Explore {item1.canteen_name} Menu</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setPickerSlot(0)}
                    className="bg-gray-50 hover:bg-orange-50/50 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[350px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-gray-900">Select Item 1</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Choose the first dish you would like to compare from any campus canteen.
                    </p>
                    <button className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 shadow-xs">
                      Browse Menu Dishes
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2 */}
              <div className="flex flex-col">
                {item2 ? (
                  <div className="bg-white rounded-2xl border-2 border-orange-200/80 shadow-xs flex-1 flex flex-col overflow-hidden">
                    {/* Dish Image Banner */}
                    <div className="h-44 w-full bg-gray-100 relative overflow-hidden group">
                      {item2.image_url ? (
                        <img src={item2.image_url} alt={item2.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                          <Utensils className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-[10px] font-bold uppercase">Campus Item</span>
                        </div>
                      )}

                      {/* Cheaper Badge Overlay */}
                      {cheaperItem && cheaperItem.id === item2.id && (
                        <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md animate-pulse">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Save ৳{priceDiff}</span>
                        </div>
                      )}

                      {/* Faster Badge Overlay */}
                      {fasterItem && fasterItem.id === item2.id && (
                        <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md">
                          <Zap className="w-3.5 h-3.5" />
                          <span>{prepDiff}m Faster</span>
                        </div>
                      )}

                      {/* Change Dish Button */}
                      <button
                        onClick={() => setPickerSlot(1)}
                        className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white px-2.5 py-1 rounded-xl text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
                      >
                        Change Dish
                      </button>
                    </div>

                    {/* Dish Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Canteen Tag */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                            <Store className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{item2.canteen_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium truncate">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{item2.canteen_location}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-gray-900 leading-snug">
                          {item2.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">
                          {item2.description || 'Delicious meal freshly made to order.'}
                        </p>
                      </div>

                      {/* Metrics Comparison Matrix */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Price:</span>
                          <span className="text-base font-black text-gray-900">
                            ৳{item2.price}{' '}
                            {cheaperItem && cheaperItem.id === item2.id && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                                Lowest Price
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Prep Time:</span>
                          <span className="font-extrabold text-gray-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            ~{item2.est_prep_time_mins || 10} mins
                            {fasterItem && fasterItem.id === item2.id && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">
                                Faster
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Student Rating:</span>
                          <span className="font-extrabold text-amber-900 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {item2.review_count > 0 ? (
                              <>
                                <span>{Number(item2.avg_rating).toFixed(1)} / 5</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  ({item2.review_count} revs)
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 font-normal">No reviews yet</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-semibold">Stock Status:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            item2.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item2.is_available ? 'Available' : 'Sold Out'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          disabled={!item2.is_available || Boolean(user?.is_blocked)}
                          onClick={() => handleAddToCart(item2)}
                          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{item2.is_available ? `Add ${item2.name} to Cart` : 'Out of Stock'}</span>
                        </button>

                        <Link
                          to={`/canteen/${item2.canteen_id}`}
                          onClick={activeClose}
                          className="text-center text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center justify-center gap-1"
                        >
                          <span>Explore {item2.canteen_name} Menu</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setPickerSlot(1)}
                    className="bg-gray-50 hover:bg-orange-50/50 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[350px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-gray-900">Select Item 2</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Choose another dish to compare prices, prep time, and ingredients.
                    </p>
                    <button className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 shadow-xs">
                      Browse Menu Dishes
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* In-place Item Picker Modal */}
      <ItemPickerModal
        isOpen={pickerSlot !== null}
        slotNumber={pickerSlot !== null ? pickerSlot + 1 : 1}
        currentItemId={pickerSlot === 0 ? item1?.id : item2?.id}
        onClose={() => setPickerSlot(null)}
        onSelect={handlePickSelect}
      />
    </>
  );
};
