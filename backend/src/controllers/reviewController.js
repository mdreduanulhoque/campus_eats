const { pool } = require('../config/db');

// POST /api/reviews (Submit review for an item)
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { menu_item_id, rating, comment } = req.body;

    // 1. Validate inputs
    const itemId = parseInt(menu_item_id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid menu_item_id is required.'
      });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    const cleanComment = comment && typeof comment === 'string' ? comment.trim() : null;

    // 2. Check if menu item exists
    const [itemRows] = await pool.query(
      'SELECT id, name, canteen_id FROM menu_items WHERE id = ?',
      [itemId]
    );
    if (itemRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found.'
      });
    }
    const menuItem = itemRows[0];

    // 3. Guardrail: User can only review items they have actually ordered and received (status === 'picked_up')
    const [deliveredRows] = await pool.query(
      `SELECT oi.id, o.id AS order_id
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ?
         AND o.status = 'picked_up'
         AND oi.menu_item_id = ?
       LIMIT 1`,
      [userId, itemId]
    );

    if (deliveredRows.length === 0) {
      return res.status(403).json({
        status: 'error',
        error_code: 'NOT_DELIVERED',
        message: `You can only write a review for '${menuItem.name}' after you have ordered and received it (picked up).`
      });
    }

    // 4. Guardrail: User can only write a review once per item
    const [existingReviews] = await pool.query(
      'SELECT id, rating, comment, created_at FROM reviews WHERE user_id = ? AND menu_item_id = ?',
      [userId, itemId]
    );

    if (existingReviews.length > 0) {
      return res.status(400).json({
        status: 'error',
        error_code: 'ALREADY_REVIEWED',
        message: `You have already reviewed '${menuItem.name}'. Each item can only be reviewed once.`,
        data: {
          existing_review: existingReviews[0]
        }
      });
    }

    // 5. Insert review
    const [insertResult] = await pool.query(
      `INSERT INTO reviews (user_id, menu_item_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [userId, itemId, parsedRating, cleanComment]
    );

    // 6. Fetch updated stats for this menu item
    const [statsRows] = await pool.query(
      `SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avg_rating, COUNT(id) AS review_count
       FROM reviews
       WHERE menu_item_id = ?`,
      [itemId]
    );

    const updatedStats = {
      avg_rating: parseFloat(statsRows[0].avg_rating || 0),
      review_count: parseInt(statsRows[0].review_count || 0, 10)
    };

    res.status(201).json({
      status: 'success',
      message: `Your review for '${menuItem.name}' has been submitted.`,
      data: {
        review: {
          id: insertResult.insertId,
          user_id: userId,
          menu_item_id: itemId,
          menu_item_name: menuItem.name,
          rating: parsedRating,
          comment: cleanComment,
          created_at: new Date()
        },
        item_stats: updatedStats
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        status: 'error',
        error_code: 'ALREADY_REVIEWED',
        message: 'You have already submitted a review for this item.'
      });
    }
    console.error('[CreateReview Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error submitting review.'
    });
  }
};

// GET /api/reviews/item/:menuItemId (Public - get reviews & rating breakdown for an item)
const getItemReviews = async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.menuItemId, 10);
    if (isNaN(menuItemId)) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid menuItemId is required.'
      });
    }

    // Check item exists
    const [itemRows] = await pool.query(
      `SELECT m.id, m.name, m.price, m.image_url, c.name AS canteen_name
       FROM menu_items m
       JOIN canteens c ON m.canteen_id = c.id
       WHERE m.id = ?`,
      [menuItemId]
    );

    if (itemRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu item not found.'
      });
    }

    const item = itemRows[0];

    // Fetch individual reviews
    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.menu_item_id = ?
       ORDER BY r.created_at DESC`,
      [menuItemId]
    );

    // Compute stats & rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    reviews.forEach((rev) => {
      const r = parseInt(rev.rating, 10);
      if (distribution[r] !== undefined) distribution[r] += 1;
      sum += r;
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? parseFloat((sum / totalReviews).toFixed(1)) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          canteen_name: item.canteen_name,
          avg_rating: avgRating,
          total_reviews: totalReviews,
          rating_distribution: distribution
        },
        reviews
      }
    });
  } catch (error) {
    console.error('[GetItemReviews Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving item reviews.'
    });
  }
};

// GET /api/reviews/my-reviews (Customer's submitted reviews)
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const [reviews] = await pool.query(
      `SELECT r.id, r.menu_item_id, r.rating, r.comment, r.created_at,
              m.name AS menu_item_name, m.image_url, m.price, m.canteen_id,
              c.name AS canteen_name
       FROM reviews r
       JOIN menu_items m ON r.menu_item_id = m.id
       JOIN canteens c ON m.canteen_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Map by menu_item_id for quick O(1) lookup
    const reviewsByItemId = {};
    reviews.forEach((r) => {
      reviewsByItemId[r.menu_item_id] = r;
    });

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        reviews_by_item_id: reviewsByItemId
      }
    });
  } catch (error) {
    console.error('[GetMyReviews Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving user reviews.'
    });
  }
};

module.exports = {
  createReview,
  getItemReviews,
  getMyReviews
};
