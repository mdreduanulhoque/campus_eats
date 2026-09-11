const cron = require('node-cron');
const { pool } = require('../config/db');
const { emitToUser } = require('./socketService');

async function checkNoShowOrders() {
  const connection = await pool.getConnection();
  try {
    // Find all 'ready' orders where CURRENT_TIMESTAMP > requested_pickup_time + 30 minutes
    const [expiredOrders] = await connection.query(`
      SELECT o.id, o.user_id, o.canteen_id, o.requested_pickup_time, u.penalty_flags
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status = 'ready'
        AND NOW() > DATE_ADD(o.requested_pickup_time, INTERVAL 30 MINUTE)
    `);

    if (expiredOrders.length === 0) {
      return { processed: 0, blockedUsers: 0 };
    }

    console.log(`[Cron: No-Show Check] Processing ${expiredOrders.length} expired orders...`);
    let blockedCount = 0;

    for (const order of expiredOrders) {
      await connection.beginTransaction();

      try {
        // 1. Update order status to 'no_show'
        await connection.query(
          "UPDATE orders SET status = 'no_show' WHERE id = ?",
          [order.id]
        );

        // 2. Increment penalty_flags and check blockade threshold
        const newFlags = (order.penalty_flags || 0) + 1;
        const shouldBlock = newFlags >= 3;

        await connection.query(
          "UPDATE users SET penalty_flags = ?, is_blocked = ? WHERE id = ?",
          [newFlags, shouldBlock, order.user_id]
        );

        if (shouldBlock) {
          blockedCount++;
        }

        // 3. Record notification
        const title = shouldBlock ? 'Account Blocked: No-Show Limit Reached' : 'Penalty Warning: No-Show';
        const message = shouldBlock
          ? `Order #${order.id} was not picked up within 30 minutes. You have reached 3 penalty strikes and your account has been blocked. Please contact the Local Admin.`
          : `Order #${order.id} was not picked up within 30 minutes of requested pickup time. You received 1 penalty strike (${newFlags}/3 strikes).`;

        await connection.query(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [order.user_id, title, message]
        );

        await connection.commit();

        // 4. Emit real-time notification to user
        emitToUser(order.user_id, 'order_status_updated', {
          orderId: order.id,
          status: 'no_show',
          penalty_flags: newFlags,
          is_blocked: shouldBlock,
          message
        });

      } catch (orderErr) {
        await connection.rollback();
        console.error(`[Cron: No-Show Check] Error processing order #${order.id}:`, orderErr);
      }
    }

    console.log(`[Cron: No-Show Check] Completed. Processed: ${expiredOrders.length}, Newly Blocked: ${blockedCount}`);
    return { processed: expiredOrders.length, blockedUsers: blockedCount };

  } catch (error) {
    console.error('[Cron: No-Show Check] Fatal check error:', error);
    return { processed: 0, blockedUsers: 0, error: error.message };
  } finally {
    connection.release();
  }
}

function initCron() {
  // Run every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron Job] Running 5-minute No-Show & Penalty Check...');
    await checkNoShowOrders();
  });
  console.log('[Cron Service] Scheduled No-Show & Penalty cron job (runs every 5 minutes)');
}

module.exports = {
  initCron,
  checkNoShowOrders
};
