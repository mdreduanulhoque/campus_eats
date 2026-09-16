const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/canteens
const getAllCanteens = async (req, res) => {
  try {
    const [canteens] = await pool.query(`
      SELECT c.id, c.name, c.location, c.is_open, c.created_at,
             COUNT(m.id) AS total_menu_items
      FROM canteens c
      LEFT JOIN menu_items m ON c.id = m.canteen_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    canteens.forEach(c => {
      c.is_open = Boolean(c.is_open);
    });

    res.status(200).json({
      status: 'success',
      data: {
        canteens
      }
    });
  } catch (error) {
    console.error('[GetAllCanteens Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving canteens.'
    });
  }
};

// GET /api/canteens/:id
const getCanteenById = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.id, 10);
    if (isNaN(canteenId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid canteen ID.' });
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.location, c.is_open, c.created_at,
              COUNT(m.id) AS total_menu_items
       FROM canteens c
       LEFT JOIN menu_items m ON c.id = m.canteen_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [canteenId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Canteen not found.' });
    }

    const canteen = rows[0];
    canteen.is_open = Boolean(canteen.is_open);

    res.status(200).json({
      status: 'success',
      data: {
        canteen
      }
    });
  } catch (error) {
    console.error('[GetCanteenById Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving canteen.'
    });
  }
};

// POST /api/canteens (Super Admin only)
const createCanteen = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Canteen name is required.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO canteens (name, location) VALUES (?, ?)',
      [name.trim(), location ? location.trim() : null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Canteen created successfully.',
      data: {
        canteen: {
          id: result.insertId,
          name: name.trim(),
          location: location ? location.trim() : null
        }
      }
    });
  } catch (error) {
    console.error('[CreateCanteen Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error creating canteen.'
    });
  }
};

// PUT /api/canteens/:id (Super Admin or Local Admin of that canteen)
const updateCanteen = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.id, 10);
    const { name, location } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Canteen name is required.'
      });
    }

    const [result] = await pool.query(
      'UPDATE canteens SET name = ?, location = ? WHERE id = ?',
      [name.trim(), location ? location.trim() : null, canteenId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Canteen not found.' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Canteen updated successfully.',
      data: {
        canteen: {
          id: canteenId,
          name: name.trim(),
          location: location ? location.trim() : null
        }
      }
    });
  } catch (error) {
    console.error('[UpdateCanteen Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error updating canteen.'
    });
  }
};

// POST /api/canteens/:id/local-admin (Super Admin only)
const assignLocalAdmin = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.id, 10);
    const { name, email, password, userId } = req.body;

    // Verify canteen exists
    const [canteen] = await pool.query('SELECT id, name FROM canteens WHERE id = ?', [canteenId]);
    if (canteen.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Canteen not found.' });
    }

    // Case 1: Assigning existing user by userId
    if (userId) {
      const [user] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (user.length === 0) {
        return res.status(404).json({ status: 'error', message: 'User not found.' });
      }

      await pool.query(
        'UPDATE users SET role = "local_admin", canteen_id = ? WHERE id = ?',
        [canteenId, userId]
      );

      return res.status(200).json({
        status: 'success',
        message: `User ${userId} assigned as local admin for ${canteen[0].name}.`
      });
    }

    // Case 2: Creating a new local admin account
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required to create a new local admin account.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, canteen_id)
       VALUES (?, ?, ?, 'local_admin', ?)`,
      [name.trim(), trimmedEmail, passwordHash, canteenId]
    );

    res.status(201).json({
      status: 'success',
      message: `Local admin account created and assigned to ${canteen[0].name}.`,
      data: {
        admin: {
          id: result.insertId,
          name: name.trim(),
          email: trimmedEmail,
          role: 'local_admin',
          canteen_id: canteenId
        }
      }
    });
  } catch (error) {
    console.error('[AssignLocalAdmin Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error assigning local admin.'
    });
  }
};

// GET /api/canteens/:id/staff (Super Admin or Local Admin of that canteen)
const getCanteenStaff = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.id, 10);
    const [staff] = await pool.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE canteen_id = ? AND role IN ('kitchen_staff', 'local_admin')
       ORDER BY role ASC, name ASC`,
      [canteenId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('[GetCanteenStaff Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving canteen staff.'
    });
  }
};

// POST /api/canteens/:id/staff (Super Admin or Local Admin of that canteen)
const createCanteenStaff = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.id, 10);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, canteen_id)
       VALUES (?, ?, ?, 'kitchen_staff', ?)`,
      [name.trim(), trimmedEmail, passwordHash, canteenId]
    );

    res.status(201).json({
      status: 'success',
      message: 'Kitchen staff account created successfully.',
      data: {
        staff: {
          id: result.insertId,
          name: name.trim(),
          email: trimmedEmail,
          role: 'kitchen_staff',
          canteen_id: canteenId
        }
      }
    });
  } catch (error) {
    console.error('[CreateCanteenStaff Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error creating kitchen staff.'
    });
  }
};

// PATCH /api/canteens/:id/status (Toggle kitchen open / closed)
const toggleCanteenStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const canteenId = parseInt(req.params.id, 10);
    if (isNaN(canteenId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid canteen ID.' });
    }

    const { is_open } = req.body;

    const [canteens] = await connection.query('SELECT id, name, is_open FROM canteens WHERE id = ?', [canteenId]);
    if (canteens.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Canteen not found.' });
    }

    const currentStatus = Boolean(canteens[0].is_open);
    const targetStatus = is_open !== undefined ? Boolean(is_open) : !currentStatus;

    await connection.beginTransaction();

    if (!targetStatus) {
      // SHUTTING DOWN CANTEEN / KITCHEN:
      // 1. Mark canteen as closed (is_open = FALSE)
      await connection.query('UPDATE canteens SET is_open = FALSE WHERE id = ?', [canteenId]);

      // 2. Save current availability state in was_available_before_close, then set is_available = FALSE
      // Preserve existing was_available_before_close if already set (e.g. repeated calls)
      await connection.query(
        `UPDATE menu_items 
         SET was_available_before_close = COALESCE(was_available_before_close, is_available),
             is_available = FALSE
         WHERE canteen_id = ?`,
        [canteenId]
      );
    } else {
      // REOPENING CANTEEN / KITCHEN:
      // 1. Mark canteen as open (is_open = TRUE)
      await connection.query('UPDATE canteens SET is_open = TRUE WHERE id = ?', [canteenId]);

      // 2. Restore ONLY those items that were open/available before shutting down!
      // Any item that had was_available_before_close = 0 (or FALSE) stays FALSE.
      // Any item that had was_available_before_close = 1 (or TRUE) becomes TRUE.
      await connection.query(
        `UPDATE menu_items 
         SET is_available = COALESCE(was_available_before_close, is_available, TRUE),
             was_available_before_close = NULL
         WHERE canteen_id = ?`,
        [canteenId]
      );
    }

    await connection.commit();

    // Fetch updated canteen and items count
    const [updatedCanteen] = await connection.query(
      'SELECT id, name, location, is_open FROM canteens WHERE id = ?',
      [canteenId]
    );

    const [items] = await connection.query(
      'SELECT id, name, is_available FROM menu_items WHERE canteen_id = ?',
      [canteenId]
    );

    const availableCount = items.filter(i => Boolean(i.is_available)).length;

    res.status(200).json({
      status: 'success',
      message: `Canteen '${canteens[0].name}' kitchen is now ${targetStatus ? 'OPEN' : 'CLOSED'}.`,
      data: {
        canteen: {
          ...updatedCanteen[0],
          is_open: Boolean(updatedCanteen[0].is_open)
        },
        total_items: items.length,
        available_items: availableCount
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[ToggleCanteenStatus Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error toggling canteen kitchen status.'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllCanteens,
  getCanteenById,
  createCanteen,
  updateCanteen,
  assignLocalAdmin,
  getCanteenStaff,
  createCanteenStaff,
  toggleCanteenStatus
};
