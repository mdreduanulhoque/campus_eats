const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'super_secret_campuseats_jwt_key_2026';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token.'
      });
    }

    // Verify user still exists in database and fetch fresh state
    const [rows] = await pool.query(
      'SELECT id, name, email, role, canteen_id, daily_budget_limit, loyalty_points, penalty_flags, is_blocked FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User account no longer exists.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication.'
    });
  }
};

module.exports = {
  verifyToken
};
