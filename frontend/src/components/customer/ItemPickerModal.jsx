import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Search, Store, X, Utensils, Check } from 'lucide-react';

export const ItemPickerModal = ({ isOpen, onClose, onSelect, currentItemId, slotNumber }) => {
  const [items, setItems] = useState([]);
  const [canteens, setCanteens] = useState([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAllDishes = async () => {
      setLoading(true);
      try {
        const [canteenRes, menuRes] = await Promise.all([
          api.get('/canteens'),
          api.get('/menu')
        ]);
        setCanteens(canteenRes.data?.data?.canteens || []);
        let loadedItems = menuRes.data?.data?.items || [];
        setItems(loadedItems);
      } catch (err) {
        console.error('Failed to load menu items for picker:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDishes();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    const matchesCanteen = selectedCanteenId ? item.canteen_id === selectedCanteenId : true;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.canteen_name && item.canteen_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCanteen && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/40">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              Select Item for Slot {slotNumber}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose any dish from any campus canteen to compare
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes or canteen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
          </div>

          {/* Canteen pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCanteenId(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCanteenId === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Canteens
            </button>
            {canteens.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCanteenId(selectedCanteenId === c.id ? null : c.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedCanteenId === c.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dishes list */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Utensils className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-500">No dishes match your filter</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = item.id === currentItemId;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
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
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Utensils className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <Store className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="font-semibold text-gray-600 truncate">{item.canteen_name}</span>
                        <span>•</span>
                        <span>~{item.est_prep_time_mins || 10}m</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-gray-900 block leading-none">
                        ৳{item.price}
                      </span>
                      <span className={`text-[10px] font-bold ${item.is_available ? 'text-emerald-600' : 'text-red-500'}`}>
                        {item.is_available ? 'In Stock' : 'Sold Out'}
                      </span>
                    </div>

                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <button className="px-3 py-1 bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-700 text-xs font-bold rounded-lg transition-colors">
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
