import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('campuseats_cart');
    return saved ? JSON.parse(saved) : { canteenId: null, canteenName: '', items: [] };
  });

  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  useEffect(() => {
    localStorage.setItem('campuseats_cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (item, canteen) => {
    setCart((prev) => {
      // If adding from a different canteen, reset cart to new canteen
      if (prev.canteenId && prev.canteenId !== canteen.id && prev.items.length > 0) {
        const confirmSwitch = window.confirm(
          `Your cart contains items from ${prev.canteenName}. Do you want to discard them and start a new order from ${canteen.name}?`
        );
        if (!confirmSwitch) return prev;
        return {
          canteenId: canteen.id,
          canteenName: canteen.name,
          items: [{ ...item, quantity: 1 }]
        };
      }

      const existingIndex = prev.items.findIndex((i) => i.id === item.id);
      let updatedItems;
      if (existingIndex > -1) {
        updatedItems = prev.items.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedItems = [...prev.items, { ...item, quantity: 1 }];
      }

      return {
        canteenId: canteen.id,
        canteenName: canteen.name,
        items: updatedItems
      };
    });
  };

  const removeItem = (itemId) => {
    setCart((prev) => {
      const updated = prev.items.filter((i) => i.id !== itemId);
      return {
        ...prev,
        items: updated,
        canteenId: updated.length === 0 ? null : prev.canteenId,
        canteenName: updated.length === 0 ? '' : prev.canteenName
      };
    });
  };

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i))
    }));
  };

  const clearCart = () => {
    setCart({ canteenId: null, canteenName: '', items: [] });
    setPointsToRedeem(0);
  };

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.min(subtotal, pointsToRedeem * 5);
  const finalTotal = Math.max(0, subtotal - discount);
  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        subtotal,
        discount,
        finalTotal,
        totalItemCount,
        pointsToRedeem,
        setPointsToRedeem,
        addItem,
        removeItem,
        updateQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
