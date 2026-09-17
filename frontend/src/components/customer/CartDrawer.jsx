import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { BudgetProgressBar } from './BudgetProgressBar';
import { X, Trash2, Plus, Minus, Clock, Award, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartDrawer = ({ isOpen, onClose }) => {
  const { cart, subtotal, discount, finalTotal, updateQuantity, removeItem, clearCart, pointsToRedeem, setPointsToRedeem } = useCart();
  const { user, reloadProfile } = useAuth();
  const navigate = useNavigate();

  // Helper date formatters
  const formatToLocalISO = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatTimeOnly = (d) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate preparation time for the cart items.
  // In a multi-canteen preorder, kitchens prepare orders concurrently.
  // Hence the minimum wait time before pickup is dictated by the slowest canteen's prep time.
  const prepTimeByCanteen = {};
  cart.items.forEach((item) => {
    const cId = item.canteen_id || 'single';
    const prep = parseInt(item.est_prep_time_mins, 10) || 10;
    const qty = parseInt(item.quantity, 10) || 1;
    prepTimeByCanteen[cId] = (prepTimeByCanteen[cId] || 0) + prep * qty;
  });

  const canteenPrepValues = Object.values(prepTimeByCanteen);
  const totalPrepMinutes = canteenPrepValues.length > 0
    ? Math.min(Math.max(...canteenPrepValues), 90)
    : 10;

  // Dynamic window calculations
  const now = new Date();
  const earliestPickup = new Date(now.getTime() + totalPrepMinutes * 60 * 1000);
  // Upper limit: 2 hours from current time (119 minutes so it ends at HH:59 within 2h)
  const latestPickup = new Date(now.getTime() + 119 * 60 * 1000);

  const today7AM = new Date(now);
  today7AM.setHours(7, 0, 0, 0);

  const today7PM = new Date(now);
  today7PM.setHours(19, 0, 0, 0);

  const effectiveMin = earliestPickup > today7AM ? earliestPickup : today7AM;
  const effectiveMax = latestPickup < today7PM ? latestPickup : today7PM;
  const isWindowClosed = effectiveMin >= effectiveMax || now >= today7PM;

  const [pickupTime, setPickupTime] = useState(() => formatToLocalISO(effectiveMin));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Keep pickupTime synchronized with valid min/max window when cart changes or drawer opens
  useEffect(() => {
    if (cart.items.length > 0 && isOpen) {
      if (!pickupTime || new Date(pickupTime) < effectiveMin || new Date(pickupTime) > effectiveMax) {
        setPickupTime(formatToLocalISO(effectiveMin));
      }
    }
  }, [cart.items, isOpen, totalPrepMinutes]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setErrorMessage('');
    if (cart.items.length === 0) return;

    if (isWindowClosed) {
      setErrorMessage('Kitchen is closed or does not have enough time for preparation before 7:00 PM.');
      return;
    }

    if (!pickupTime) {
      setErrorMessage('Please select a requested pickup time.');
      return;
    }

    const selectedDate = new Date(pickupTime);
    if (isNaN(selectedDate.getTime())) {
      setErrorMessage('Please select a valid pickup date and time.');
      return;
    }

    const checkNow = new Date();
    // Leeway of 30 seconds for clock differences / delay
    const minAllowed = new Date(checkNow.getTime() + totalPrepMinutes * 60 * 1000 - 30 * 1000);
    const maxAllowed = new Date(checkNow.getTime() + 2 * 60 * 60 * 1000 + 30 * 1000);

    if (selectedDate < minAllowed) {
      setErrorMessage(
        `Pickup time must be after ${formatTimeOnly(effectiveMin)} (at least ${totalPrepMinutes} mins from now to allow kitchen preparation).`
      );
      return;
    }

    if (selectedDate > maxAllowed) {
      setErrorMessage(
        `Pickup time must be within a 2-hour window from now (before ${formatTimeOnly(effectiveMax)}).`
      );
      return;
    }

    // Validate 7:00 AM (420 mins) to 7:00 PM (1140 mins)
    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes < 420 || totalMinutes > 1140) {
      setErrorMessage('Pickup time must be between 7:00 AM and 7:00 PM.');
      return;
    }

    setSubmitting(true);
    try {
      // Format pickup time as ISO string
      const isoPickup = selectedDate.toISOString();

      const payload = {
        items: cart.items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        requested_pickup_time: isoPickup,
        points_to_redeem: pointsToRedeem
      };

      if (cart.canteenId) {
        payload.canteen_id = cart.canteenId;
      }

      const res = await api.post('/orders', payload);
      const newOrder = res.data.data.order;

      // Reset cart and reload profile for updated points
      clearCart();
      await reloadProfile();
      onClose();
      navigate('/orders');
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const userPoints = user?.loyalty_points || 0;
  const maxRedeemable = Math.min(userPoints, Math.floor(subtotal / 5));

  // Group items by canteen for clear presentation
  const itemsByCanteenGroup = cart.items.reduce((acc, item) => {
    const cName = item.canteen_name || 'Selected Canteen';
    if (!acc[cName]) acc[cName] = [];
    acc[cName].push(item);
    return acc;
  }, {});

  const isMultiCanteen = Object.keys(itemsByCanteenGroup).length > 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
                {cart.canteenName && (
                  <p className="text-xs text-gray-500 font-medium">{cart.canteenName}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {cart.items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Your cart is empty</p>
                <p className="text-xs text-gray-400 mt-1">Browse canteen menus to add tasty meals!</p>
              </div>
            ) : (
              Object.entries(itemsByCanteenGroup).map(([canteenName, groupItems]) => (
                <div key={canteenName} className="space-y-2.5">
                  {isMultiCanteen && (
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span className="text-xs font-black text-orange-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                        {canteenName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {groupItems.length} item{groupItems.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <div className="flex-1 pr-3">
                        <p className="font-bold text-sm text-gray-900 leading-snug">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.price} BDT each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-2xs">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            {cart.items.length > 0 && (
              <div className="space-y-4 pt-2">
                {/* Pickup Time Picker */}
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Requested Pickup Time
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      Prep: ~{totalPrepMinutes} mins
                    </span>
                  </div>

                  <input
                    type="datetime-local"
                    value={pickupTime}
                    min={formatToLocalISO(effectiveMin)}
                    max={formatToLocalISO(effectiveMax)}
                    disabled={isWindowClosed}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />

                  {isWindowClosed ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                      Canteen is closed or closing soon. Not enough time for preparation before 7:00 PM.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-orange-950">
                        <span>Allowed Pickup Window (2h limit):</span>
                        <span className="font-extrabold text-orange-700">
                          {formatTimeOnly(effectiveMin)} – {formatTimeOnly(effectiveMax)}
                        </span>
                      </div>
                      <p className="text-[10px] text-orange-800/80 leading-relaxed">
                        Must be after {formatTimeOnly(effectiveMin)} (prep time) and within 2 hours from now. Canteen hours: 7:00 AM – 7:00 PM.
                      </p>
                    </div>
                  )}

                  {isMultiCanteen && !isWindowClosed && (
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-amber-900">
                        <span>🍱</span>
                        <span>Multi-Canteen Preorder Pickup Rule</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        This checkout will be divided into separate canteen preorders with the <strong>exact same pickup time</strong>. You must pick up your items from each canteen. If items from one canteen are not collected, the preorder is treated as never picked up.
                      </p>
                    </div>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                {userPoints > 0 && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" />
                        Redeem Loyalty Points
                      </span>
                      <span className="text-[11px] font-bold text-amber-800">
                        {userPoints} pts available
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={maxRedeemable}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(parseInt(e.target.value, 10) || 0)}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-amber-900 min-w-[50px] text-right">
                        {pointsToRedeem} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      Discount: <strong>{pointsToRedeem * 5} BDT</strong> (1 pt = 5 BDT)
                    </p>
                  </div>
                )}

                {/* Budget Guardrail Visual Indicator (Logged in students) */}
                {user?.role === 'user' && (
                  <BudgetProgressBar currentCartTotal={finalTotal} />
                )}

                {/* Guest Notice */}
                {!user && (
                  <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-orange-800">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-bold text-orange-950">Browsing as Guest</p>
                      <p className="text-[11px] text-orange-700 mt-0.5">
                        Your tray is saved. You can sign in or create an account to finalize and submit your order.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs font-bold text-red-800">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-gray-100 bg-white space-y-3">
              <div className="space-y-1.5 text-xs text-gray-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)} BDT</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Points Discount</span>
                    <span>-{discount.toFixed(2)} BDT</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>Cash on Pickup</span>
                  <span className="text-orange-600">{finalTotal.toFixed(2)} BDT</span>
                </div>
              </div>

              {!user ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/login');
                    }}
                    className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Sign in to Place Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] text-center text-gray-400">
                    Sign in or register to complete your preorder
                  </p>
                </div>
              ) : (
                <button
                  disabled={submitting || Boolean(user?.is_blocked) || isWindowClosed}
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span>Submitting Order...</span>
                  ) : isWindowClosed ? (
                    <span>Kitchen Closed for Today</span>
                  ) : (
                    <>
                      <span>Confirm Preorder</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
