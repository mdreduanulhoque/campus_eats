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

  const getCanteenSummary = (items) => {
    const uniqueMap = {};
    items.forEach((i) => {
      if (i.canteen_id && !uniqueMap[i.canteen_id]) {
        uniqueMap[i.canteen_id] = i.canteen_name || `Canteen #${i.canteen_id}`;
      }
    });
    const ids = Object.keys(uniqueMap);
    const canteens = ids.map((id) => ({ id: parseInt(id, 10), name: uniqueMap[id] }));
    const canteenId = ids.length === 1 ? parseInt(ids[0], 10) : null;
    const canteenName = ids.length === 1 
      ? uniqueMap[ids[0]] 
      : (ids.length > 1 ? `Multi-Canteen Preorder (${ids.length} Canteens)` : '');
    return { canteenId, canteenName, canteens };
  };

  const addItem = (item, canteen) => {
    setCart((prev) => {
      const cId = canteen?.id || item.canteen_id;
      const cName = canteen?.name || item.canteen_name || 'Canteen';

      const existingIndex = prev.items.findIndex((i) => i.id === item.id);
      let updatedItems;
      if (existingIndex > -1) {
        updatedItems = prev.items.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedItems = [
          ...prev.items,
          {
            ...item,
            canteen_id: cId,
            canteen_name: cName,
            quantity: 1
          }
        ];
      }

      const summary = getCanteenSummary(updatedItems);

      return {
        ...prev,
        ...summary,
        items: updatedItems
      };
    });
  };

  const removeItem = (itemId) => {
    setCart((prev) => {
      const updated = prev.items.filter((i) => i.id !== itemId);
      const summary = getCanteenSummary(updated);
      return {
        ...prev,
        ...summary,
        items: updated
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
    setCart({ canteenId: null, canteenName: '', canteens: [], items: [] });
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
