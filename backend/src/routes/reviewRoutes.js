const express = require('express');
const {
  createReview,
  getItemReviews,
  getMyReviews
} = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Public route to get reviews for an item
router.get('/item/:menuItemId', getItemReviews);

// Protected routes (Customer must be authenticated)
router.use(verifyToken);

router.post('/', createReview);
router.get('/my-reviews', getMyReviews);

module.exports = router;
