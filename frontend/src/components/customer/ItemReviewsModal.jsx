import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { 
  X, 
  Star, 
  Store, 
  Utensils, 
  MessageSquare, 
  User, 
  Calendar 
} from 'lucide-react';

export const ItemReviewsModal = ({ isOpen, onClose, item }) => {
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !item?.id) return;

    const fetchItemReviews = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/reviews/item/${item.id}`);
        setReviewsData(res.data?.data);
      } catch (err) {
        console.error('Failed to load item reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItemReviews();
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const summary = reviewsData?.item || item;
  const reviews = reviewsData?.reviews || [];
  const distribution = summary.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalReviews = summary.total_reviews || summary.review_count || 0;
  const avgRating = summary.avg_rating !== undefined ? Number(summary.avg_rating).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-amber-50/30">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 truncate">Customer Reviews</h2>
            <p className="text-xs text-gray-500 truncate">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Dish Top Summary */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-14 h-14 rounded-xl bg-orange-100 overflow-hidden shrink-0 flex items-center justify-center text-orange-400">
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
                <Utensils className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm text-gray-900 truncate">{item.name}</h3>
              {item.canteen_name && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Store className="w-3 h-3 text-orange-500" />
                  <span>{item.canteen_name}</span>
                </p>
              )}
              {item.price && (
                <span className="text-xs font-black text-orange-600 mt-0.5 block">
                  {item.price} BDT
                </span>
              )}
            </div>
          </div>

          {/* Rating Breakdown Card */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="text-center sm:text-left sm:pr-4 sm:border-r sm:border-amber-200/80 shrink-0">
              <span className="text-3xl sm:text-4xl font-black text-amber-900 block leading-none">
                {avgRating}
              </span>
              <div className="flex items-center gap-0.5 my-1 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(Number(avgRating))
                        ? 'fill-amber-500 text-amber-500'
                        : 'fill-transparent text-amber-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-800">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Bars */}
            <div className="w-full space-y-1.5 flex-1">
              {[5, 4, 3, 2, 1].map((ratingNum) => {
                const count = distribution[ratingNum] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={ratingNum} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-bold text-gray-600 text-[11px]">{ratingNum}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-[10px] font-semibold text-gray-400 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Reviews List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                <span>Customer Feedback ({reviews.length})</span>
              </h4>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">No reviews yet for this dish</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Order this meal and share your experience once received!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[11px] font-bold">
                          {rev.reviewer_name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {rev.reviewer_name || 'Verified Student'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-transparent text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-gray-800 ml-1">
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    {rev.comment ? (
                      <p className="text-xs text-gray-600 leading-relaxed pl-8">
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic pl-8">
                        No written comment provided.
                      </p>
                    )}

                    <div className="text-[10px] text-gray-400 pl-8 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
