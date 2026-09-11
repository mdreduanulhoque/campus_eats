const { pool } = require('../config/db');

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.canteen_id, u.daily_budget_limit, u.loyalty_points,
              u.penalty_flags, u.is_blocked, u.created_at,
              c.name AS canteen_name
       FROM users u
       LEFT JOIN canteens c ON u.canteen_id = c.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: rows[0]
      }
    });
  } catch (error) {
    console.error('[GetProfile Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving user profile.'
    });
  }
};

// PATCH /api/users/budget
const updateBudget = async (req, res) => {
  try {
    const { daily_budget_limit } = req.body;

    if (daily_budget_limit === undefined || daily_budget_limit === null) {
      return res.status(400).json({
        status: 'error',
        message: 'daily_budget_limit is required.'
      });
    }

    const budget = parseFloat(daily_budget_limit);
    if (isNaN(budget) || budget < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'daily_budget_limit must be a non-negative number (0 means no limit).'
      });
    }

    await pool.query(
      'UPDATE users SET daily_budget_limit = ? WHERE id = ?',
      [budget, req.user.id]
    );

    res.status(200).json({
      status: 'success',
      message: 'Daily budget limit updated successfully.',
      data: {
        daily_budget_limit: budget
      }
    });
  } catch (error) {
    console.error('[UpdateBudget Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error updating budget limit.'
    });
  }
};

// GET /api/users/notifications
const getNotifications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.status(200).json({
      status: 'success',
      data: {
        notifications: rows
      }
    });
  } catch (error) {
    console.error('[GetNotifications Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving notifications.'
    });
  }
};

// PATCH /api/users/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid notification ID.'
      });
    }

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found or does not belong to you.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.'
    });
  } catch (error) {
    console.error('[MarkNotificationRead Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error updating notification.'
    });
  }
};

// GET /api/users/penalties
const getPenalties = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT penalty_flags, is_blocked FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = rows[0];
    let warningMessage = 'Account in good standing.';
    if (user.is_blocked) {
      warningMessage = 'Your account has been blocked due to repeated no-shows. Please contact the Local Admin to unblock.';
    } else if (user.penalty_flags > 0) {
      warningMessage = `Warning: You have ${user.penalty_flags} penalty strike(s). 3 strikes will cause your account to be blocked.`;
    }

    res.status(200).json({
      status: 'success',
      data: {
        penalty_flags: user.penalty_flags,
        is_blocked: Boolean(user.is_blocked),
        message: warningMessage
      }
    });
  } catch (error) {
    console.error('[GetPenalties Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving penalty details.'
    });
  }
};

module.exports = {
  getProfile,
  updateBudget,
  getNotifications,
  markNotificationRead,
  getPenalties
};
