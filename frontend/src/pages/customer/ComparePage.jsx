import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { ItemPickerModal } from '../../components/customer/ItemPickerModal';
import api from '../../api/client';
import { 
  ArrowLeft, 
  ArrowLeftRight, 
  Trash2, 
  Store, 
  MapPin, 
  Clock, 
  Plus, 
  Utensils, 
  Sparkles, 
  TrendingDown, 
  Zap, 
  ExternalLink,
  Star
} from 'lucide-react';

export const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    comparedItems, 
    removeFromCompare, 
    clearCompare, 
    swapItems, 
    setItemAtSlot,
    addToCompare 
  } = useCompare();

  const { addItem } = useCart();
  const { user } = useAuth();

  const [pickerSlot, setPickerSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync URL query params (?item1=1&item2=2) with CompareContext if present
  useEffect(() => {
    const q1 = searchParams.get('item1');
    const q2 = searchParams.get('item2');

    if (q1 || q2) {
      const loadFromParams = async () => {
        setLoading(true);
        try {
          if (q1 && (!comparedItems[0] || comparedItems[0].id !== parseInt(q1, 10))) {
            const res1 = await api.get(`/menu/${q1}`);
            if (res1.data?.data?.item) {
              setItemAtSlot(0, res1.data.data.item);
            }
          }
          if (q2 && (!comparedItems[1] || comparedItems[1].id !== parseInt(q2, 10))) {
            const res2 = await api.get(`/menu/${q2}`);
            if (res2.data?.data?.item) {
              setItemAtSlot(1, res2.data.data.item);
            }
          }
        } catch (err) {
          console.error('Error syncing compare query params:', err);
        } finally {
          setLoading(false);
        }
      };
      loadFromParams();
    }
  }, [searchParams]);

  const item1 = comparedItems[0] || null;
  const item2 = comparedItems[1] || null;

  // Comparison metrics calculation
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-12 space-y-6">
      {/* Top back navigation and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campus Menu
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Compare Campus Meals
            </h1>
            {item1 && item2 && !sameCanteen && (
              <span className="text-xs uppercase font-black px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                Across Canteens
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Compare prices, prep times, and ingredients side-by-side to make the best meal choice
          </p>
        </div>

        <div className="flex items-center gap-2">
          {item1 && item2 && (
            <button
              onClick={swapItems}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeftRight className="w-4 h-4 text-orange-600" />
              <span>Swap Sides</span>
            </button>
          )}

          {comparedItems.length > 0 && (
            <button
              onClick={clearCompare}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Comparison</span>
            </button>
          )}
        </div>
      </div>

      {/* Verdict Alert Pill */}
      {item1 && item2 && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-orange-500/10 flex items-center gap-3">
          <Sparkles className="w-6 h-6 shrink-0 text-white animate-pulse" />
          <div className="text-xs sm:text-sm font-medium">
            <span className="font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded mr-2 text-[11px]">
              Summary Verdict
            </span>
            {cheaperItem ? (
              <span>
                <strong>{cheaperItem.name}</strong> ({cheaperItem.canteen_name}) is <strong>৳{priceDiff} cheaper ({cheaperPercent}% lower price)</strong>.
              </span>
            ) : (
              <span>Both dishes are priced identically at ৳{price1}.</span>
            )}
            {fasterItem ? (
              <span>
                {' '}Additionally, <strong>{fasterItem.name}</strong> is <strong>{prepDiff} minutes faster</strong> (~{fasterItem.est_prep_time_mins}m vs ~{fasterItem.id === item1.id ? prep2 : prep1}m).
              </span>
            ) : (
              <span> Both have similar estimated preparation times (~{prep1} mins).</span>
            )}
          </div>
        </div>
      )}

      {/* Side by Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Item 1 Column */}
        <div>
          {item1 ? (
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm flex flex-col overflow-hidden">
              <div className="h-52 w-full bg-gray-100 relative overflow-hidden group">
                {item1.image_url ? (
                  <img src={item1.image_url} alt={item1.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <Utensils className="w-12 h-12 mb-1" />
                    <span className="text-xs font-bold uppercase">Campus Meal</span>
                  </div>
                )}

                {cheaperItem && cheaperItem.id === item1.id && (
                  <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md animate-pulse">
                    <TrendingDown className="w-4 h-4" />
                    <span>Save ৳{priceDiff}</span>
                  </div>
                )}

                {fasterItem && fasterItem.id === item1.id && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md">
                    <Zap className="w-4 h-4" />
                    <span>{prepDiff}m Faster</span>
                  </div>
                )}

                <button
                  onClick={() => setPickerSlot(0)}
                  className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
                >
                  Change Dish
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                      <Store className="w-4 h-4 shrink-0" />
                      <span>{item1.canteen_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{item1.canteen_location}</span>
                    </div>
                  </div>

                  <h2 className="text-xl font-black text-gray-900">{item1.name}</h2>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {item1.description || 'Delicious meal freshly prepared upon order.'}
                  </p>
                </div>

                {/* Specs Box */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Price</span>
                    <span className="text-lg font-black text-gray-900">
                      ৳{item1.price}{' '}
                      {cheaperItem && cheaperItem.id === item1.id && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-1">
                          Cheaper Choice
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Preparation Time</span>
                    <span className="font-extrabold text-gray-900 flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4 text-amber-500" />
                      ~{item1.est_prep_time_mins || 10} mins
                      {fasterItem && fasterItem.id === item1.id && (
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1">
                          Faster
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Student Rating</span>
                    <span className="font-extrabold text-amber-900 flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {item1.review_count > 0 ? (
                        <>
                          <span>{Number(item1.avg_rating).toFixed(1)} / 5</span>
                          <span className="text-[11px] text-gray-400 font-normal">
                            ({item1.review_count} revs)
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-normal text-xs">No reviews yet</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Availability</span>
                    <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                      item1.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item1.is_available ? 'In Stock' : 'Sold Out'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={!item1.is_available || Boolean(user?.is_blocked)}
                    onClick={() => handleAddToCart(item1)}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{item1.is_available ? `Add ${item1.name} to Cart` : 'Out of Stock'}</span>
                  </button>

                  <Link
                    to={`/canteen/${item1.canteen_id}`}
                    className="block text-center text-xs font-bold text-orange-600 hover:underline py-1"
                  >
                    View {item1.canteen_name} Full Menu
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setPickerSlot(0)}
              className="bg-white hover:bg-orange-50/40 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[450px]"
            >
              <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900">Select 1st Dish</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-xs">
                Pick any meal from any university cafeteria to start comparing.
              </p>
              <button className="mt-5 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-600">
                Pick Dish
              </button>
            </div>
          )}
        </div>

        {/* Item 2 Column */}
        <div>
          {item2 ? (
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm flex flex-col overflow-hidden">
              <div className="h-52 w-full bg-gray-100 relative overflow-hidden group">
                {item2.image_url ? (
                  <img src={item2.image_url} alt={item2.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <Utensils className="w-12 h-12 mb-1" />
                    <span className="text-xs font-bold uppercase">Campus Meal</span>
                  </div>
                )}

                {cheaperItem && cheaperItem.id === item2.id && (
                  <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md animate-pulse">
                    <TrendingDown className="w-4 h-4" />
                    <span>Save ৳{priceDiff}</span>
                  </div>
                )}

                {fasterItem && fasterItem.id === item2.id && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md">
                    <Zap className="w-4 h-4" />
                    <span>{prepDiff}m Faster</span>
                  </div>
                )}

                <button
                  onClick={() => setPickerSlot(1)}
                  className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
                >
                  Change Dish
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                      <Store className="w-4 h-4 shrink-0" />
                      <span>{item2.canteen_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{item2.canteen_location}</span>
                    </div>
                  </div>

                  <h2 className="text-xl font-black text-gray-900">{item2.name}</h2>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {item2.description || 'Delicious meal freshly prepared upon order.'}
                  </p>
                </div>

                {/* Specs Box */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Price</span>
                    <span className="text-lg font-black text-gray-900">
                      ৳{item2.price}{' '}
                      {cheaperItem && cheaperItem.id === item2.id && (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-1">
                          Cheaper Choice
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Preparation Time</span>
                    <span className="font-extrabold text-gray-900 flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4 text-amber-500" />
                      ~{item2.est_prep_time_mins || 10} mins
                      {fasterItem && fasterItem.id === item2.id && (
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-1">
                          Faster
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Student Rating</span>
                    <span className="font-extrabold text-amber-900 flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {item2.review_count > 0 ? (
                        <>
                          <span>{Number(item2.avg_rating).toFixed(1)} / 5</span>
                          <span className="text-[11px] text-gray-400 font-normal">
                            ({item2.review_count} revs)
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-normal text-xs">No reviews yet</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-semibold">Availability</span>
                    <span className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                      item2.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item2.is_available ? 'In Stock' : 'Sold Out'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    disabled={!item2.is_available || Boolean(user?.is_blocked)}
                    onClick={() => handleAddToCart(item2)}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{item2.is_available ? `Add ${item2.name} to Cart` : 'Out of Stock'}</span>
                  </button>

                  <Link
                    to={`/canteen/${item2.canteen_id}`}
                    className="block text-center text-xs font-bold text-orange-600 hover:underline py-1"
                  >
                    View {item2.canteen_name} Full Menu
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setPickerSlot(1)}
              className="bg-white hover:bg-orange-50/40 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[450px]"
            >
              <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900">Select 2nd Dish</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-xs">
                Pick another meal from any university cafeteria to compare price and prep time.
              </p>
              <button className="mt-5 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-orange-600">
                Pick Dish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dish Picker Modal */}
      <ItemPickerModal
        isOpen={pickerSlot !== null}
        slotNumber={pickerSlot !== null ? pickerSlot + 1 : 1}
        currentItemId={pickerSlot === 0 ? item1?.id : item2?.id}
        onClose={() => setPickerSlot(null)}
        onSelect={handlePickSelect}
      />
    </div>
  );
};
export default ComparePage;
