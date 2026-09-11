import React, { useState } from 'react';
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

  const [pickupTime, setPickupTime] = useState(() => {
    // Default to 15 minutes from now
    const now = new Date(Date.now() + 15 * 60000);
    return now.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setErrorMessage('');
    if (cart.items.length === 0) return;

    if (!pickupTime) {
      setErrorMessage('Please select a requested pickup time.');
      return;
    }

    setSubmitting(true);
    try {
      // Format pickup time as ISO string
      const isoPickup = new Date(pickupTime).toISOString();

      const payload = {
        canteen_id: cart.canteenId,
        items: cart.items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        requested_pickup_time: isoPickup,
        points_to_redeem: pointsToRedeem
      };

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
              cart.items.map((item) => (
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
              ))
            )}

            {cart.items.length > 0 && (
              <div className="space-y-4 pt-2">
                {/* Pickup Time Picker */}
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Requested Pickup Time
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Kitchen will review and confirm this preparation window.
                  </p>
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

                {/* Budget Guardrail Visual Indicator */}
                <BudgetProgressBar currentCartTotal={finalTotal} />

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

              <button
                disabled={submitting}
                onClick={handleCheckout}
                className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting Order...</span>
                ) : (
                  <>
                    <span>Confirm Preorder</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
