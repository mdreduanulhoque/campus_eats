const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/canteens
const getAllCanteens = async (req, res) => {
  try {
    const [canteens] = await pool.query(`
      SELECT c.id, c.name, c.location, c.created_at,
             COUNT(m.id) AS total_menu_items
      FROM canteens c
      LEFT JOIN menu_items m ON c.id = m.canteen_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

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
      `SELECT c.id, c.name, c.location, c.created_at,
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

    res.status(200).json({
      status: 'success',
      data: {
        canteen: rows[0]
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

module.exports = {
  getAllCanteens,
  getCanteenById,
  createCanteen,
  updateCanteen,
  assignLocalAdmin,
  getCanteenStaff,
  createCanteenStaff
};
