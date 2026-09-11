const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'super_secret_campuseats_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      canteen_id: user.canteen_id
    },
    secret,
    { expiresIn }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if email already registered
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, canteen_id, daily_budget_limit, loyalty_points)
       VALUES (?, ?, ?, 'user', NULL, 0.00, 0)`,
      [name.trim(), trimmedEmail, passwordHash]
    );

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      email: trimmedEmail,
      role: 'user',
      canteen_id: null,
      daily_budget_limit: 0.00,
      loyalty_points: 0,
      penalty_flags: 0,
      is_blocked: false
    };

    const token = generateToken(newUser);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully.',
      data: {
        token,
        user: newUser
      }
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration.'
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, canteen_id, daily_budget_limit, loyalty_points, penalty_flags, is_blocked
       FROM users WHERE email = ?`,
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    // Exclude password_hash from response
    delete user.password_hash;

    res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login.'
    });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('[GetMe Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving user profile.'
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};
