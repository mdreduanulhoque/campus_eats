const { pool } = require('../config/db');

// PATCH /api/admin/users/:id/unblock (Local Admin or Super Admin)
const unblockUser = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID.' });
    }

    const [userRows] = await pool.query('SELECT id, name, email, penalty_flags, is_blocked FROM users WHERE id = ?', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    // Reset is_blocked to false and clear penalty_flags
    await pool.query(
      'UPDATE users SET is_blocked = FALSE, penalty_flags = 0 WHERE id = ?',
      [targetUserId]
    );

    // Notify user of being unblocked
    await pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [targetUserId, 'Account Unblocked', 'Your account has been unblocked by the canteen administrator. You may now place orders again.']
    );

    res.status(200).json({
      status: 'success',
      message: `User ${userRows[0].name} has been successfully unblocked and penalty flags cleared.`,
      data: {
        userId: targetUserId,
        is_blocked: false,
        penalty_flags: 0
      }
    });

  } catch (error) {
    console.error('[UnblockUser Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error unblocking user.'
    });
  }
};

// GET /api/admin/users/penalized (Local Admin or Super Admin)
const getPenalizedUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, penalty_flags, is_blocked, created_at
      FROM users
      WHERE penalty_flags > 0 OR is_blocked = TRUE
      ORDER BY is_blocked DESC, penalty_flags DESC
    `);

    res.status(200).json({
      status: 'success',
      data: {
        users: rows
      }
    });
  } catch (error) {
    console.error('[GetPenalizedUsers Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving penalized users.'
    });
  }
};

// GET /api/admin/analytics/:canteenId (Local Admin or Super Admin)
const getCanteenAnalytics = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.canteenId, 10);
    if (isNaN(canteenId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid canteen ID.' });
    }

    // 1. Total revenue & orders count for completed ('picked_up') orders
    const [revRows] = await pool.query(
      `SELECT COUNT(*) AS total_completed_orders,
              COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM orders
       WHERE canteen_id = ? AND status = 'picked_up'`,
      [canteenId]
    );

    // 2. Orders breakdown by status
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE canteen_id = ?
       GROUP BY status`,
      [canteenId]
    );

    // 3. Peak pickup hours analysis
    const [peakHoursRows] = await pool.query(
      `SELECT HOUR(requested_pickup_time) AS pickup_hour,
              COUNT(*) AS order_count
       FROM orders
       WHERE canteen_id = ?
       GROUP BY HOUR(requested_pickup_time)
       ORDER BY pickup_hour ASC`,
      [canteenId]
    );

    // 4. Top selling menu items
    const [topItemsRows] = await pool.query(
      `SELECT m.id, m.name, SUM(oi.quantity) AS total_quantity_sold, SUM(oi.quantity * oi.price_at_time) AS total_sales
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.canteen_id = ? AND o.status = 'picked_up'
       GROUP BY m.id, m.name
       ORDER BY total_quantity_sold DESC
       LIMIT 5`,
      [canteenId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        canteen_id: canteenId,
        overview: {
          total_revenue: parseFloat(revRows[0].total_revenue),
          total_completed_orders: revRows[0].total_completed_orders
        },
        orders_by_status: statusRows,
        peak_hours: peakHoursRows,
        top_items: topItemsRows
      }
    });

  } catch (error) {
    console.error('[GetCanteenAnalytics Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving analytics.'
    });
  }
};

module.exports = {
  unblockUser,
  getPenalizedUsers,
  getCanteenAnalytics
};
