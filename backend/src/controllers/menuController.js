const { pool } = require('../config/db');

// GET /api/menu (Public - all items with canteen tag info)
const getAllMenuItems = async (req, res) => {
  try {
    const { available_only, canteen_id, search } = req.query;
    let query = `
      SELECT m.id, m.canteen_id, m.name, m.description, m.price, m.image_url,
             m.est_prep_time_mins, m.is_available, m.created_at,
             c.name AS canteen_name, c.location AS canteen_location
      FROM menu_items m
      JOIN canteens c ON m.canteen_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (canteen_id) {
      query += ' AND m.canteen_id = ?';
      params.push(parseInt(canteen_id, 10));
    }

    if (available_only === 'true' || available_only === '1') {
      query += ' AND m.is_available = TRUE';
    }

    if (search && search.trim()) {
      query += ' AND (m.name LIKE ? OR m.description LIKE ? OR c.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY c.name ASC, m.name ASC';

    const [items] = await pool.query(query, params);

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

    const { available_only } = req.query;
    let query = `
      SELECT id, canteen_id, name, description, price, image_url, est_prep_time_mins, is_available, created_at
      FROM menu_items
      WHERE canteen_id = ?
    `;
    const params = [canteenId];

    if (available_only === 'true' || available_only === '1') {
      query += ' AND is_available = TRUE';
    }

    query += ' ORDER BY name ASC';

    const [items] = await pool.query(query, params);

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
              c.name AS canteen_name
       FROM menu_items m
       JOIN canteens c ON m.canteen_id = c.id
       WHERE m.id = ?`,
      [itemId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Menu item not found.' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        item: rows[0]
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

    await pool.query(
      `UPDATE menu_items 
       SET name = ?, description = ?, price = ?, image_url = ?, est_prep_time_mins = ?, is_available = ?
       WHERE id = ?`,
      [updatedName, updatedDesc, updatedPrice, updatedImg, updatedPrep, updatedAvail, itemId]
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
          is_available: updatedAvail
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

module.exports = {
  getAllMenuItems,
  getMenuByCanteen,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};
