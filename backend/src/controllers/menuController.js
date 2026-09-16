const { pool } = require('../config/db');

// GET /api/menu (Public - all items with canteen tag info)
const getAllMenuItems = async (req, res) => {
  try {
    const {
      available_only,
      canteen_id,
      search,
      min_price,
      max_price,
      min_rating,
      sort_by,
      include_closed
    } = req.query;

    let query = `
      SELECT m.id, m.canteen_id, m.name, m.description, m.price, m.image_url,
             m.est_prep_time_mins, m.is_available, m.created_at,
             c.name AS canteen_name, c.location AS canteen_location,
             c.is_open AS canteen_is_open,
             COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
             COUNT(r.id) AS review_count
      FROM menu_items m
      JOIN canteens c ON m.canteen_id = c.id
      LEFT JOIN reviews r ON m.id = r.menu_item_id
      WHERE 1=1
    `;
    const params = [];

    if (canteen_id) {
      query += ' AND m.canteen_id = ?';
      params.push(parseInt(canteen_id, 10));
    }

    // Default student order feed: only show items from open canteens that are available
    if (include_closed !== 'true' && include_closed !== '1') {
      query += ' AND c.is_open = TRUE AND m.is_available = TRUE';
    } else if (available_only === 'true' || available_only === '1') {
      query += ' AND m.is_available = TRUE';
    }

    // Search matches titles (names) and descriptions
    if (search && search.trim()) {
      query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (min_price && !isNaN(parseFloat(min_price))) {
      query += ' AND m.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(parseFloat(max_price))) {
      query += ' AND m.price <= ?';
      params.push(parseFloat(max_price));
    }

    query += ' GROUP BY m.id, c.name, c.location, c.is_open';

    if (min_rating && !isNaN(parseFloat(min_rating))) {
      query += ' HAVING avg_rating >= ?';
      params.push(parseFloat(min_rating));
    }

    // Dynamic sorting: default to ascending order by price and rating when searching
    const effectiveSort = sort_by || (search && search.trim() ? 'price_rating_asc' : 'default');

    if (effectiveSort === 'price_rating_asc' || effectiveSort === 'price_asc') {
      query += ' ORDER BY m.price ASC, avg_rating ASC, m.name ASC';
    } else if (effectiveSort === 'price_desc') {
      query += ' ORDER BY m.price DESC, avg_rating DESC, m.name ASC';
    } else if (effectiveSort === 'rating_desc') {
      query += ' ORDER BY avg_rating DESC, m.price ASC, m.name ASC';
    } else if (effectiveSort === 'rating_asc') {
      query += ' ORDER BY avg_rating ASC, m.price ASC, m.name ASC';
    } else {
      query += ' ORDER BY c.name ASC, m.name ASC';
    }

    const [items] = await pool.query(query, params);

    items.forEach((item) => {
      item.avg_rating = parseFloat(item.avg_rating || 0);
      item.review_count = parseInt(item.review_count || 0, 10);
      item.canteen_is_open = Boolean(item.canteen_is_open);
      item.is_available = Boolean(item.is_available);
    });

    res.status(200).json({
      status: 'success',
      data: {
        items
      }
    });
  } catch (error) {
    console.error('[GetAllMenuItems Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving menu items.'
    });
  }
};

// GET /api/canteens/:canteenId/menu
const getMenuByCanteen = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.canteenId, 10);
    if (isNaN(canteenId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid canteen ID.' });
    }

    const { available_only, search, min_price, max_price, min_rating, sort_by } = req.query;
    let query = `
      SELECT m.id, m.canteen_id, m.name, m.description, m.price, m.image_url,
             m.est_prep_time_mins, m.is_available, m.was_available_before_close, m.created_at,
             c.name AS canteen_name, c.is_open AS canteen_is_open,
             COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
             COUNT(r.id) AS review_count
      FROM menu_items m
      JOIN canteens c ON m.canteen_id = c.id
      LEFT JOIN reviews r ON m.id = r.menu_item_id
      WHERE m.canteen_id = ?
    `;
    const params = [canteenId];

    if (available_only === 'true' || available_only === '1') {
      query += ' AND m.is_available = TRUE AND c.is_open = TRUE';
    }

    if (search && search.trim()) {
      query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (min_price && !isNaN(parseFloat(min_price))) {
      query += ' AND m.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(parseFloat(max_price))) {
      query += ' AND m.price <= ?';
      params.push(parseFloat(max_price));
    }

    query += ' GROUP BY m.id, c.name, c.is_open';

    if (min_rating && !isNaN(parseFloat(min_rating))) {
      query += ' HAVING avg_rating >= ?';
      params.push(parseFloat(min_rating));
    }

    const effectiveSort = sort_by || (search && search.trim() ? 'price_rating_asc' : 'default');

    if (effectiveSort === 'price_rating_asc' || effectiveSort === 'price_asc') {
      query += ' ORDER BY m.price ASC, avg_rating ASC, m.name ASC';
    } else if (effectiveSort === 'price_desc') {
      query += ' ORDER BY m.price DESC, avg_rating DESC, m.name ASC';
    } else if (effectiveSort === 'rating_desc') {
      query += ' ORDER BY avg_rating DESC, m.price ASC, m.name ASC';
    } else if (effectiveSort === 'rating_asc') {
      query += ' ORDER BY avg_rating ASC, m.price ASC, m.name ASC';
    } else {
      query += ' ORDER BY m.name ASC';
    }

    const [items] = await pool.query(query, params);

    items.forEach((item) => {
      item.avg_rating = parseFloat(item.avg_rating || 0);
      item.review_count = parseInt(item.review_count || 0, 10);
      item.canteen_is_open = Boolean(item.canteen_is_open);
      item.is_available = Boolean(item.is_available);
    });

    res.status(200).json({
      status: 'success',
      data: {
        items
      }
    });
  } catch (error) {
    console.error('[GetMenuByCanteen Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving menu items.'
    });
  }
};

// GET /api/menu/:id
const getMenuItemById = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid menu item ID.' });
    }

    const [rows] = await pool.query(
      `SELECT m.id, m.canteen_id, m.name, m.description, m.price, m.image_url,
              m.est_prep_time_mins, m.is_available, m.created_at,
              c.name AS canteen_name, c.location AS canteen_location,
              c.is_open AS canteen_is_open,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
              COUNT(r.id) AS review_count
       FROM menu_items m
       JOIN canteens c ON m.canteen_id = c.id
       LEFT JOIN reviews r ON m.id = r.menu_item_id
       WHERE m.id = ?
       GROUP BY m.id, c.name, c.location, c.is_open`,
      [itemId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    const item = rows[0];
    item.avg_rating = parseFloat(item.avg_rating || 0);
    item.review_count = parseInt(item.review_count || 0, 10);
    item.canteen_is_open = Boolean(item.canteen_is_open);
    item.is_available = Boolean(item.is_available);

    res.status(200).json({
      status: 'success',
      data: {
        item
      }
    });
  } catch (error) {
    console.error('[GetMenuItemById Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving menu item.'
    });
  }
};

// POST /api/menu (Super Admin or Local Admin)
const createMenuItem = async (req, res) => {
  try {
    let { canteen_id, name, description, price, image_url, est_prep_time_mins } = req.body;

    // If local admin, force their assigned canteen_id
    if (req.user.role === 'local_admin') {
      canteen_id = req.user.canteen_id;
    }

    if (!canteen_id) {
      return res.status(400).json({ status: 'error', message: 'canteen_id is required.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Item name is required.' });
    }

    const itemPrice = parseFloat(price);
    if (isNaN(itemPrice) || itemPrice <= 0) {
      return res.status(400).json({ status: 'error', message: 'Price must be a positive number.' });
    }

    const prepTime = est_prep_time_mins ? parseInt(est_prep_time_mins, 10) : 10;

    // Verify canteen exists
    const [canteen] = await pool.query('SELECT id FROM canteens WHERE id = ?', [canteen_id]);
    if (canteen.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Canteen not found.' });
    }

    const [result] = await pool.query(
      `INSERT INTO menu_items (canteen_id, name, description, price, image_url, est_prep_time_mins, is_available)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [canteen_id, name.trim(), description ? description.trim() : null, itemPrice, image_url || null, prepTime]
    );

    res.status(201).json({
      status: 'success',
      message: 'Menu item created successfully.',
      data: {
        item: {
          id: result.insertId,
          canteen_id,
          name: name.trim(),
          description: description ? description.trim() : null,
          price: itemPrice,
          image_url: image_url || null,
          est_prep_time_mins: prepTime,
          is_available: true
        }
      }
    });
  } catch (error) {
    console.error('[CreateMenuItem Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error creating menu item.'
    });
  }
};

// PUT /api/menu/:id (Super Admin or Local Admin)
const updateMenuItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid menu item ID.' });
    }

    // Check item existence and tenant boundary
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    const item = rows[0];

    // Local admin cannot update items belonging to other canteens
    if (req.user.role === 'local_admin' && item.canteen_id !== req.user.canteen_id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You can only manage menu items for your assigned canteen.'
      });
    }

    const { name, description, price, image_url, est_prep_time_mins, is_available } = req.body;

    const updatedName = name !== undefined ? name.trim() : item.name;
    const updatedDesc = description !== undefined ? description : item.description;
    const updatedPrice = price !== undefined ? parseFloat(price) : item.price;
    const updatedImg = image_url !== undefined ? image_url : item.image_url;
    const updatedPrep = est_prep_time_mins !== undefined ? parseInt(est_prep_time_mins, 10) : item.est_prep_time_mins;
    const updatedAvail = is_available !== undefined ? Boolean(is_available) : item.is_available;

    if (isNaN(updatedPrice) || updatedPrice <= 0) {
      return res.status(400).json({ status: 'error', message: 'Price must be a positive number.' });
    }

    // Check if parent canteen is currently open or closed
    const [canteenRows] = await pool.query('SELECT is_open FROM canteens WHERE id = ?', [item.canteen_id]);
    const canteenIsOpen = canteenRows.length > 0 ? Boolean(canteenRows[0].is_open) : true;

    let finalIsAvailable = updatedAvail;
    let finalWasAvailable = item.was_available_before_close;

    if (!canteenIsOpen) {
      // Canteen is closed: item must stay not available in feed, but store intended state
      finalIsAvailable = false;
      finalWasAvailable = updatedAvail;
    } else {
      finalWasAvailable = null;
    }

    await pool.query(
      `UPDATE menu_items 
       SET name = ?, description = ?, price = ?, image_url = ?, est_prep_time_mins = ?, is_available = ?, was_available_before_close = ?
       WHERE id = ?`,
      [updatedName, updatedDesc, updatedPrice, updatedImg, updatedPrep, finalIsAvailable, finalWasAvailable, itemId]
    );

    res.status(200).json({
      status: 'success',
      message: 'Menu item updated successfully.',
      data: {
        item: {
          id: itemId,
          canteen_id: item.canteen_id,
          name: updatedName,
          description: updatedDesc,
          price: updatedPrice,
          image_url: updatedImg,
          est_prep_time_mins: updatedPrep,
          is_available: finalIsAvailable,
          was_available_before_close: finalWasAvailable
        }
      }
    });
  } catch (error) {
    console.error('[UpdateMenuItem Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error updating menu item.'
    });
  }
};

// DELETE /api/menu/:id (Super Admin or Local Admin)
const deleteMenuItem = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid menu item ID.' });
    }

    const [rows] = await pool.query('SELECT canteen_id FROM menu_items WHERE id = ?', [itemId]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    const item = rows[0];
    if (req.user.role === 'local_admin' && item.canteen_id !== req.user.canteen_id) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You can only delete menu items for your assigned canteen.'
      });
    }

    await pool.query('DELETE FROM menu_items WHERE id = ?', [itemId]);

    res.status(200).json({
      status: 'success',
      message: 'Menu item deleted successfully.'
    });
  } catch (error) {
    console.error('[DeleteMenuItem Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error deleting menu item.'
    });
  }
};

// PATCH /api/menu/:id/availability (Kitchen Staff, Local Admin, Super Admin)
const toggleAvailability = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid menu item ID.' });
    }

    const [rows] = await pool.query('SELECT id, canteen_id, name, is_available FROM menu_items WHERE id = ?', [itemId]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    const item = rows[0];

    // Enforce canteen boundary for kitchen_staff and local_admin
    if (
      (req.user.role === 'kitchen_staff' || req.user.role === 'local_admin') &&
      item.canteen_id !== req.user.canteen_id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You can only toggle menu availability for your assigned canteen.'
      });
    }

    // New state: either explicitly provided in body or inverted
    const newAvailability = req.body.is_available !== undefined
      ? Boolean(req.body.is_available)
      : !item.is_available;

    await pool.query('UPDATE menu_items SET is_available = ? WHERE id = ?', [newAvailability, itemId]);

    res.status(200).json({
      status: 'success',
      message: `Menu item '${item.name}' is now ${newAvailability ? 'available' : 'unavailable'}.`,
      data: {
        id: itemId,
        canteen_id: item.canteen_id,
        is_available: newAvailability
      }
    });
  } catch (error) {
    console.error('[ToggleAvailability Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error toggling menu availability.'
    });
  }
};

// GET /api/menu/compare?item1=X&item2=Y or ?ids=X,Y
const compareMenuItems = async (req, res) => {
  try {
    const { item1, item2, ids } = req.query;
    let id1, id2;

    if (item1 && item2) {
      id1 = parseInt(item1, 10);
      id2 = parseInt(item2, 10);
    } else if (ids) {
      const parts = ids.split(',').map((p) => parseInt(p.trim(), 10));
      id1 = parts[0];
      id2 = parts[1];
    }

    if (!id1 || !id2 || isNaN(id1) || isNaN(id2)) {
      return res.status(400).json({
        status: 'error',
        message: 'Two valid menu item IDs are required for comparison (e.g., ?item1=1&item2=2).'
      });
    }

    if (id1 === id2) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot compare an item with itself. Please select two different items.'
      });
    }

    const [rows] = await pool.query(
      `SELECT m.id, m.canteen_id, m.name, m.description, m.price, m.image_url,
              m.est_prep_time_mins, m.is_available, m.created_at,
              c.name AS canteen_name, c.location AS canteen_location,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
              COUNT(r.id) AS review_count
       FROM menu_items m
       JOIN canteens c ON m.canteen_id = c.id
       LEFT JOIN reviews r ON m.id = r.menu_item_id
       WHERE m.id IN (?, ?)
       GROUP BY m.id, c.name, c.location`,
      [id1, id2]
    );

    if (rows.length < 2) {
      return res.status(404).json({
        status: 'error',
        message: 'One or both menu items could not be found for comparison.'
      });
    }

    rows.forEach((r) => {
      r.avg_rating = parseFloat(r.avg_rating || 0);
      r.review_count = parseInt(r.review_count || 0, 10);
    });

    const firstItem = rows.find((r) => r.id === id1);
    const secondItem = rows.find((r) => r.id === id2);

    const price1 = parseFloat(firstItem.price);
    const price2 = parseFloat(secondItem.price);
    const priceDiff = Math.abs(price1 - price2);
    let cheaperId = null;
    let cheaperDiffPercent = 0;
    if (price1 < price2) {
      cheaperId = firstItem.id;
      cheaperDiffPercent = price2 > 0 ? Math.round(((price2 - price1) / price2) * 100) : 0;
    } else if (price2 < price1) {
      cheaperId = secondItem.id;
      cheaperDiffPercent = price1 > 0 ? Math.round(((price1 - price2) / price1) * 100) : 0;
    }

    const prep1 = firstItem.est_prep_time_mins || 10;
    const prep2 = secondItem.est_prep_time_mins || 10;
    const prepTimeDiff = Math.abs(prep1 - prep2);
    let fasterId = null;
    if (prep1 < prep2) {
      fasterId = firstItem.id;
    } else if (prep2 < prep1) {
      fasterId = secondItem.id;
    }

    const rating1 = firstItem.avg_rating;
    const rating2 = secondItem.avg_rating;
    const ratingDiff = Math.abs(rating1 - rating2);
    let higherRatedId = null;
    if (rating1 > rating2) {
      higherRatedId = firstItem.id;
    } else if (rating2 > rating1) {
      higherRatedId = secondItem.id;
    }

    const sameCanteen = firstItem.canteen_id === secondItem.canteen_id;

    res.status(200).json({
      status: 'success',
      data: {
        item1: firstItem,
        item2: secondItem,
        metrics: {
          price_diff: priceDiff,
          cheaper_item_id: cheaperId,
          cheaper_diff_percent: cheaperDiffPercent,
          prep_time_diff: prepTimeDiff,
          faster_item_id: fasterId,
          rating_diff: ratingDiff,
          higher_rated_item_id: higherRatedId,
          same_canteen: sameCanteen
        }
      }
    });
  } catch (error) {
    console.error('[CompareMenuItems Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error comparing menu items.'
    });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuByCanteen,
  getMenuItemById,
  compareMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};
