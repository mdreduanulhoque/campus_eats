import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const [comparedItems, setComparedItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem('campuseats_compare_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('campuseats_compare_items', JSON.stringify(comparedItems));
    } catch (e) {
      console.error('Failed to save compare items to sessionStorage:', e);
    }
  }, [comparedItems]);

  const normalizeItem = (item, canteen) => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      est_prep_time_mins: item.est_prep_time_mins || 10,
      is_available: Boolean(item.is_available),
      image_url: item.image_url || null,
      canteen_id: item.canteen_id || canteen?.id,
      canteen_name: item.canteen_name || canteen?.name || 'Campus Canteen',
      canteen_location: item.canteen_location || canteen?.location || 'Campus Center'
    };
  };

  const addToCompare = (item, canteen = null) => {
    const normalized = normalizeItem(item, canteen);
    setComparedItems((prev) => {
      // Check if already in list
      if (prev.some((i) => i.id === normalized.id)) {
        return prev;
      }
      if (prev.length === 0) {
        return [normalized];
      }
      if (prev.length === 1) {
        return [prev[0], normalized];
      }
      // If already 2 items, replace the second item with the new one
      return [prev[0], normalized];
    });
  };

  const removeFromCompare = (itemId) => {
    setComparedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const toggleCompare = (item, canteen = null) => {
    if (isInCompare(item.id)) {
      removeFromCompare(item.id);
    } else {
      addToCompare(item, canteen);
    }
  };

  const isInCompare = (itemId) => {
    return comparedItems.some((i) => i.id === itemId);
  };

  const setItemAtSlot = (index, item, canteen = null) => {
    const normalized = normalizeItem(item, canteen);
    setComparedItems((prev) => {
      const next = [...prev];
      // Check if item already in the other slot
      const otherIndex = index === 0 ? 1 : 0;
      if (next[otherIndex] && next[otherIndex].id === normalized.id) {
        // Swap slots
        return [next[1], next[0]];
      }
      next[index] = normalized;
      return next.filter(Boolean);
    });
  };

  const swapItems = () => {
    setComparedItems((prev) => {
      if (prev.length === 2) {
        return [prev[1], prev[0]];
      }
      return prev;
    });
  };

  const clearCompare = () => {
    setComparedItems([]);
  };

  const openCompareModal = () => setIsCompareModalOpen(true);
  const closeCompareModal = () => setIsCompareModalOpen(false);

  return (
    <CompareContext.Provider
      value={{
        comparedItems,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        isInCompare,
        setItemAtSlot,
        swapItems,
        clearCompare,
        isCompareModalOpen,
        openCompareModal,
        closeCompareModal
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
