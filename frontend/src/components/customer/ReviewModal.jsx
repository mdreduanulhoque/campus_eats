import React, { useState } from 'react';
import api from '../../api/client';
import { 
  X, 
  Star, 
  Store, 
  Utensils, 
  CheckCircle2, 
  AlertCircle, 
  Send 
} from 'lucide-react';

const RATING_LABELS = {
  1: { label: 'Poor', desc: 'Disappointing taste or quality' },
  2: { label: 'Fair', desc: 'Could be much better' },
  3: { label: 'Good', desc: 'Decent meal, met expectations' },
  4: { label: 'Very Good', desc: 'Delicious and well prepared' },
  5: { label: 'Outstanding', desc: 'Exceptional flavor & quality!' }
};

export const ReviewModal = ({ isOpen, onClose, item, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !item) return null;

  const activeRating = hoveredRating || rating;
  const ratingInfo = RATING_LABELS[activeRating] || RATING_LABELS[5];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/reviews', {
        menu_item_id: item.menu_item_id || item.id,
        rating,
        comment: comment.trim()
      });

      setSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted({
          menu_item_id: item.menu_item_id || item.id,
          rating,
          comment: comment.trim(),
          review: res.data?.data?.review,
          item_stats: res.data?.data?.item_stats
        });
      }

      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-scale-in">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-amber-50/30">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Write a Review</h2>
            <p className="text-xs text-gray-500">Review your ordered dish</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Dish Card Summary */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
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
              <h3 className="font-bold text-sm text-gray-900 truncate">{item.name}</h3>
              {item.canteen_name && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Store className="w-3 h-3 text-orange-500" />
                  <span>{item.canteen_name}</span>
                </p>
              )}
              {item.price_at_time && (
                <span className="text-xs font-extrabold text-orange-600 mt-0.5 block">
                  {item.price_at_time} BDT
                </span>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold">Review submitted successfully!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Thank you for sharing your feedback.</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating Picker */}
              <div className="text-center space-y-2 py-1">
                <label className="text-xs font-bold text-gray-600 block uppercase tracking-wider">
                  Your Overall Rating
                </label>
                
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 text-amber-400 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'fill-transparent text-gray-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="h-7 flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-amber-900">
                    {ratingInfo.label}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {ratingInfo.desc}
                  </span>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">
                    Share your experience (optional)
                  </label>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {comment.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the portion size, taste, freshness, and temperature?"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
