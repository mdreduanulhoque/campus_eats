import React from 'react';
import { useCompare } from '../../context/CompareContext';
import { ArrowLeftRight, X, Sparkles, Plus, Store, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CompareDock = () => {
  const { comparedItems, removeFromCompare, clearCompare, swapItems, openCompareModal } = useCompare();
  const navigate = useNavigate();

  if (comparedItems.length === 0) return null;

  const item1 = comparedItems[0];
  const item2 = comparedItems[1];

  const handleOpenCompare = () => {
    openCompareModal();
  };

  return (
    <aside
      aria-label="Food comparison tray"
      className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl bg-gray-900/95 backdrop-blur-md text-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-800/80 p-3 sm:p-3.5 transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Comparison Items Preview Slots */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Slot 1 */}
          <div className="flex items-center gap-2 bg-gray-800/90 rounded-xl sm:rounded-2xl p-1.5 sm:px-2.5 sm:py-1.5 flex-1 min-w-0 border border-gray-700/60 relative group">
            <div className="w-8 h-8 rounded-lg bg-gray-700 shrink-0 overflow-hidden relative">
              {item1.image_url ? (
                <img src={item1.image_url} alt={item1.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-orange-400">
                  #1
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-black truncate leading-tight text-gray-100">
                {item1.name}
              </p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-semibold truncate flex items-center gap-1">
                <span>৳{item1.price}</span>
                <span>•</span>
                <span className="text-orange-400 truncate">{item1.canteen_name}</span>
              </p>
            </div>
            <button
              onClick={() => removeFromCompare(item1.id)}
              className="text-gray-400 hover:text-red-400 p-1 rounded-full transition-colors cursor-pointer shrink-0"
              title="Remove item 1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* VS Divider & Swap */}
          <button
            onClick={swapItems}
            disabled={!item2}
            className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs hover:bg-orange-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            title={item2 ? "Swap positions" : "Add a 2nd item to compare"}
          >
            {item2 ? (
              <ArrowLeftRight className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
            ) : (
              <span>VS</span>
            )}
          </button>

          {/* Slot 2 */}
          {item2 ? (
            <div className="flex items-center gap-2 bg-gray-800/90 rounded-xl sm:rounded-2xl p-1.5 sm:px-2.5 sm:py-1.5 flex-1 min-w-0 border border-gray-700/60 relative group">
              <div className="w-8 h-8 rounded-lg bg-gray-700 shrink-0 overflow-hidden relative">
                {item2.image_url ? (
                  <img src={item2.image_url} alt={item2.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-orange-400">
                    #2
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-black truncate leading-tight text-gray-100">
                  {item2.name}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 font-semibold truncate flex items-center gap-1">
                  <span>৳{item2.price}</span>
                  <span>•</span>
                  <span className="text-orange-400 truncate">{item2.canteen_name}</span>
                </p>
              </div>
              <button
                onClick={() => removeFromCompare(item2.id)}
                className="text-gray-400 hover:text-red-400 p-1 rounded-full transition-colors cursor-pointer shrink-0"
                title="Remove item 2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenCompare}
              className="flex items-center justify-center gap-1 bg-gray-800/50 hover:bg-gray-800 border border-dashed border-gray-600 rounded-xl sm:rounded-2xl p-1.5 sm:px-2.5 sm:py-1.5 flex-1 min-w-0 text-gray-400 hover:text-orange-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold truncate">Pick 2nd dish</span>
            </button>
          )}
        </div>

        {/* Action Button & Clear */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpenCompare}
            className="px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl sm:rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-orange-500/30 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Compare {comparedItems.length}/2</span>
          </button>

          <button
            onClick={clearCompare}
            className="p-2 text-gray-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
            title="Clear comparison"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
