const { pool } = require('../config/db');
const { emitToCanteen, emitToUser } = require('../services/socketService');

// Allowed status transitions state machine
const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'cancelled_by_user', 'failed_by_canteen'],
  accepted: ['preparing', 'cancelled_by_user', 'failed_by_canteen'],
  preparing: ['ready', 'failed_by_canteen'],
  ready: ['picked_up', 'no_show'],
  picked_up: [],
  cancelled_by_user: [],
  failed_by_canteen: [],
  no_show: []
};

// POST /api/orders (Customer Checkout - Supports Single & Multi-Canteen Preorders)
const createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { canteen_id, items, requested_pickup_time, points_to_redeem } = req.body;

    // 1. Guard: Check if user is blocked
    const [userRows] = await connection.query(
      'SELECT id, name, loyalty_points, daily_budget_limit, is_blocked, penalty_flags FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const user = userRows[0];
    if (user.is_blocked) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is blocked due to 3 penalty strikes. Please contact the Local Admin.'
      });
    }

    // 2. Validate Cart and Pickup Time
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Cart items cannot be empty.' });
    }

    if (!requested_pickup_time) {
      return res.status(400).json({ status: 'error', message: 'requested_pickup_time is required.' });
    }

    const pickupDate = new Date(requested_pickup_time);
    if (isNaN(pickupDate.getTime()) || pickupDate.getTime() < Date.now() - 300000) {
      return res.status(400).json({
        status: 'error',
        message: 'requested_pickup_time must be a valid future datetime.'
      });
    }

    // Pickup time must be between 7:00 AM (07:00) and 7:00 PM (19:00)
    let hours, minutes;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: process.env.TZ || 'Asia/Dhaka',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(pickupDate);
      hours = parseInt(parts.find(p => p.type === 'hour')?.value, 10);
      minutes = parseInt(parts.find(p => p.type === 'minute')?.value, 10);
    } catch (e) {
      hours = pickupDate.getHours();
      minutes = pickupDate.getMinutes();
    }

    const totalMinutes = hours * 60 + minutes;
    // 07:00 AM is 420 mins; 07:00 PM (19:00) is 1140 mins
    if (totalMinutes < 420 || totalMinutes > 1140) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_PICKUP_TIME',
        message: 'Pickup time must be between 7:00 AM and 7:00 PM.'
      });
    }

    // 3. Fetch and validate all menu items and their canteens
    const itemIds = items.map(i => i.menu_item_id);
    const [dbItems] = await connection.query(
      `SELECT m.id, m.canteen_id, m.name, m.price, m.est_prep_time_mins, m.is_available,
              c.name AS canteen_name, c.is_open AS canteen_is_open
       FROM menu_items m
       JOIN canteens c ON m.canteen_id = c.id
       WHERE m.id IN (?)`,
      [itemIds]
    );

    const dbItemsMap = {};
    dbItems.forEach(item => { dbItemsMap[item.id] = item; });

    // Group items by canteen
    const itemsByCanteen = {};
    let overallSubtotal = 0;

    for (const item of items) {
      const dbItem = dbItemsMap[item.menu_item_id];
      if (!dbItem) {
        return res.status(400).json({
          status: 'error',
          message: `Menu item #${item.menu_item_id} does not exist.`
        });
      }

      // If a specific canteen_id was passed in req.body and items don't match, validate single-canteen constraint
      if (canteen_id && dbItem.canteen_id !== parseInt(canteen_id, 10) && items.every(i => dbItemsMap[i.menu_item_id]?.canteen_id === parseInt(canteen_id, 10))) {
        return res.status(400).json({
          status: 'error',
          message: `Menu item '${dbItem.name}' does not belong to selected canteen.`
        });
      }

      if (!dbItem.is_available) {
        return res.status(400).json({
          status: 'error',
          message: `Menu item '${dbItem.name}' is currently out of stock.`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          status: 'error',
          message: `Quantity for '${dbItem.name}' must be at least 1.`
        });
      }

      const cId = dbItem.canteen_id;
      if (!itemsByCanteen[cId]) {
        itemsByCanteen[cId] = {
          canteen_id: cId,
          canteen_name: dbItem.canteen_name,
          canteen_is_open: Boolean(dbItem.canteen_is_open),
          items: [],
          subtotal: 0,
          prepMinutes: 0
        };
      }

      const itemPrep = parseInt(dbItem.est_prep_time_mins, 10) || 10;
      itemsByCanteen[cId].prepMinutes += itemPrep * qty;

      const itemTotal = parseFloat(dbItem.price) * qty;
      itemsByCanteen[cId].subtotal += itemTotal;
      overallSubtotal += itemTotal;

      itemsByCanteen[cId].items.push({
        menu_item_id: dbItem.id,
        name: dbItem.name,
        quantity: qty,
        price_at_time: parseFloat(dbItem.price)
      });
    }

    const canteenGroups = Object.values(itemsByCanteen);

    // Verify all involved canteens are open
    for (const group of canteenGroups) {
      if (!group.canteen_is_open) {
        return res.status(400).json({
          status: 'error',
          code: 'CANTEEN_CLOSED',
          message: `Canteen '${group.canteen_name}' kitchen is currently closed and not accepting orders.`
        });
      }
    }

    // Dynamic Pickup Time Window Validation:
    // When ordering across multiple canteens, preparation happens concurrently in kitchens.
    // Minimum pickup time is determined by the slowest canteen's prep time so both orders are ready.
    const maxPrepMinutes = Math.min(
      Math.max(...canteenGroups.map(g => g.prepMinutes)),
      90
    );
    const orderNow = Date.now();
    const minPickupTimestamp = orderNow + maxPrepMinutes * 60 * 1000 - 30000;
    const maxPickupTimestamp = orderNow + 2 * 60 * 60 * 1000 + 30000;

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: process.env.TZ || 'Asia/Dhaka',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });

    if (pickupDate.getTime() < minPickupTimestamp) {
      const earliestStr = timeFormatter.format(new Date(orderNow + maxPrepMinutes * 60 * 1000));
      return res.status(400).json({
        status: 'error',
        code: 'PICKUP_TOO_EARLY',
        message: `Pickup time must be after ${earliestStr} (at least ${maxPrepMinutes} mins from now to allow kitchen preparation).`
      });
    }

    if (pickupDate.getTime() > maxPickupTimestamp) {
      const latestStr = timeFormatter.format(new Date(orderNow + 2 * 60 * 60 * 1000));
      return res.status(400).json({
        status: 'error',
        code: 'PICKUP_WINDOW_EXCEEDED',
        message: `Pickup time must be within a 2-hour window from now (before ${latestStr}).`
      });
    }

    // 4. Points Redemption Calculation
    const pointsRedeemed = points_to_redeem ? parseInt(points_to_redeem, 10) : 0;
    if (pointsRedeemed < 0) {
      return res.status(400).json({ status: 'error', message: 'points_to_redeem cannot be negative.' });
    }

    if (pointsRedeemed > user.loyalty_points) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient loyalty points. You requested to redeem ${pointsRedeemed} points, but have only ${user.loyalty_points} points.`
      });
    }

    // 1 point = 5 Taka discount
    const totalDiscount = pointsRedeemed * 5;
    const overallFinalTotal = Math.max(0, overallSubtotal - totalDiscount);

    // 5. The Budget Guardrail
    const budgetLimit = parseFloat(user.daily_budget_limit || 0);
    if (budgetLimit > 0) {
      const [spentRows] = await connection.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS today_spent
         FROM orders
         WHERE user_id = ?
           AND DATE(created_at) = CURDATE()
           AND status NOT IN ('cancelled_by_user', 'failed_by_canteen')`,
        [userId]
      );

      const todaySpent = parseFloat(spentRows[0].today_spent || 0);
      if (todaySpent + overallFinalTotal > budgetLimit) {
        return res.status(400).json({
          status: 'error',
          error_code: 'BUDGET_LIMIT_EXCEEDED',
          message: `Daily budget limit exceeded! You have already spent ${todaySpent.toFixed(2)} BDT today against your ${budgetLimit.toFixed(2)} BDT daily limit. This order (${overallFinalTotal.toFixed(2)} BDT) would bring today's total to ${(todaySpent + overallFinalTotal).toFixed(2)} BDT.`,
          data: {
            daily_budget_limit: budgetLimit,
            today_spent: todaySpent,
            order_total: overallFinalTotal,
            remaining_budget: Math.max(0, budgetLimit - todaySpent)
          }
        });
      }
    }

    // Distribute redeemed points and discounts across canteen groups
    let remainingPoints = pointsRedeemed;
    for (let i = 0; i < canteenGroups.length; i++) {
      const group = canteenGroups[i];
      if (i === canteenGroups.length - 1) {
        // Last group receives whatever remaining points are left
        group.points_redeemed = remainingPoints;
      } else {
        const maxPointsForGroup = Math.floor(group.subtotal / 5);
        const pts = Math.min(remainingPoints, maxPointsForGroup);
        group.points_redeemed = pts;
        remainingPoints -= pts;
      }
      group.discount = group.points_redeemed * 5;
      group.total_amount = Math.max(0, group.subtotal - group.discount);
    }

    // 6. Execute Transaction
    const orderGroupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    await connection.beginTransaction();

    // Deduct redeemed points from user
    if (pointsRedeemed > 0) {
      await connection.query(
        'UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ?',
        [pointsRedeemed, userId]
      );
    }

    const createdOrders = [];

    // Create separate order records for each canteen with the identical requested_pickup_time
    for (const group of canteenGroups) {
      const [orderResult] = await connection.query(
        `INSERT INTO orders (user_id, canteen_id, total_amount, points_redeemed, points_earned, status, requested_pickup_time, order_group_id)
         VALUES (?, ?, ?, ?, 0, 'pending', ?, ?)`,
        [userId, group.canteen_id, group.total_amount, group.points_redeemed, pickupDate, orderGroupId]
      );

      const orderId = orderResult.insertId;

      for (const oi of group.items) {
        await connection.query(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time)
           VALUES (?, ?, ?, ?)`,
          [orderId, oi.menu_item_id, oi.quantity, oi.price_at_time]
        );
      }

      const createdOrder = {
        id: orderId,
        user_id: userId,
        canteen_id: group.canteen_id,
        canteen_name: group.canteen_name,
        total_amount: group.total_amount,
        subtotal: group.subtotal,
        discount: group.discount,
        points_redeemed: group.points_redeemed,
        status: 'pending',
        requested_pickup_time,
        order_group_id: orderGroupId,
        items: group.items
      };

      createdOrders.push(createdOrder);
    }

    await connection.commit();

    // 7. Emit Real-Time Socket Events to Respective Canteens and User
    for (const ord of createdOrders) {
      emitToCanteen(ord.canteen_id, 'new_order', ord);
    }
    emitToUser(userId, 'new_orders', { order_group_id: orderGroupId, orders: createdOrders });

    res.status(201).json({
      status: 'success',
      message: createdOrders.length > 1
        ? `Preorder successfully divided into ${createdOrders.length} separate orders with identical pickup time.`
        : 'Order placed successfully.',
      data: {
        order: createdOrders[0],
        orders: createdOrders,
        order_group_id: orderGroupId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('[CreateOrder Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error processing order.'
    });
  } finally {
    connection.release();
  }
};

// PATCH /api/orders/:id/status (State Machine Transition)
const updateOrderStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status: targetStatus } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ status: 'error', message: 'Target status is required.' });
    }

    const [orderRows] = await connection.query(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, c.name AS canteen_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN canteens c ON o.canteen_id = c.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const order = orderRows[0];
    const currentStatus = order.status;

    // Authorization checks based on user role and target status
    if (targetStatus === 'cancelled_by_user') {
      if (req.user.role !== 'user' && req.user.role !== 'super_admin') {
        return res.status(403).json({ status: 'error', message: 'Only customer can cancel by user.' });
      }
      if (req.user.role === 'user' && req.user.id !== order.user_id) {
        return res.status(403).json({ status: 'error', message: 'You can only cancel your own orders.' });
      }

      // CRITICAL GUARD: User can only cancel if pending or accepted
      if (currentStatus !== 'pending' && currentStatus !== 'accepted') {
        return res.status(400).json({
          status: 'error',
          error_code: 'CANNOT_CANCEL_PREPARING',
          message: `Cannot cancel order #${orderId}. Food preparation has already started (${currentStatus}).`
        });
      }
    } else {
      // For staff actions (accepted, preparing, ready, picked_up, failed_by_canteen)
      if (req.user.role === 'user') {
        return res.status(403).json({ status: 'error', message: 'Customers cannot modify order status directly.' });
      }
      if (
        (req.user.role === 'kitchen_staff' || req.user.role === 'local_admin') &&
        req.user.canteen_id !== order.canteen_id
      ) {
        return res.status(403).json({ status: 'error', message: 'Forbidden. Order belongs to another canteen.' });
      }
    }

    // State machine check
    const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'None (Terminal state)'}`
      });
    }

    // Cross-canteen guard: Cannot pick up if another order in the combined preorder is already marked no_show
    if (targetStatus === 'picked_up' && order.order_group_id) {
      const [noShowSiblings] = await connection.query(
        "SELECT id, canteen_id FROM orders WHERE order_group_id = ? AND status = 'no_show'",
        [order.order_group_id]
      );
      if (noShowSiblings.length > 0) {
        return res.status(400).json({
          status: 'error',
          code: 'ORDER_GROUP_NO_SHOW',
          message: `Cannot pick up order #${orderId}. Part of this combined preorder was abandoned or never picked up within the allowed pickup window.`
        });
      }
    }

    await connection.beginTransaction();

    let pointsEarned = 0;
    let notificationTitle = '';
    let notificationMessage = '';

    // Handle special business logic on status changes:
    if (targetStatus === 'picked_up') {
      // Earning Loyalty Points: floor(Order_Total / 100)
      pointsEarned = Math.floor(parseFloat(order.total_amount) / 100);
      if (pointsEarned > 0) {
        await connection.query(
          'UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?',
          [pointsEarned, order.user_id]
        );
      }
      await connection.query(
        'UPDATE orders SET status = ?, points_earned = ? WHERE id = ?',
        [targetStatus, pointsEarned, orderId]
      );

      notificationTitle = 'Order Picked Up!';
      notificationMessage = `Your order #${orderId} from ${order.canteen_name} was completed. You earned ${pointsEarned} loyalty point(s)!`;

    } else if (targetStatus === 'failed_by_canteen') {
      // Compensation: 3 loyalty points awarded + refund any redeemed points
      const pointsCompensation = 3;
      const pointsToRestore = pointsCompensation + (order.points_redeemed || 0);

      await connection.query(
        'UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?',
        [pointsToRestore, order.user_id]
      );

      await connection.query('UPDATE orders SET status = ? WHERE id = ?', [targetStatus, orderId]);

      notificationTitle = 'Order Failed by Canteen';
      notificationMessage = `We sincerely apologize! ${order.canteen_name} could not fulfill your order #${orderId}. We have credited 3 loyalty points to your account${order.points_redeemed > 0 ? ` and refunded ${order.points_redeemed} redeemed points` : ''}.`;

    } else if (targetStatus === 'cancelled_by_user') {
      // Refund redeemed points if order cancelled by user
      if (order.points_redeemed > 0) {
        await connection.query(
          'UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?',
          [order.points_redeemed, order.user_id]
        );
      }
      await connection.query('UPDATE orders SET status = ? WHERE id = ?', [targetStatus, orderId]);

      notificationTitle = 'Order Cancelled';
      notificationMessage = `Your order #${orderId} was cancelled${order.points_redeemed > 0 ? ` and ${order.points_redeemed} points were refunded to your account` : ''}.`;

    } else {
      // standard intermediate transitions: accepted, preparing, ready
      await connection.query('UPDATE orders SET status = ? WHERE id = ?', [targetStatus, orderId]);

      if (targetStatus === 'accepted') {
        notificationTitle = 'Order Accepted!';
        notificationMessage = `${order.canteen_name} accepted your order #${orderId}. Requested pickup time: ${new Date(order.requested_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      } else if (targetStatus === 'preparing') {
        notificationTitle = 'Kitchen Started Preparing';
        notificationMessage = `The kitchen is now preparing your food for order #${orderId}. Order can no longer be cancelled.`;
      } else if (targetStatus === 'ready') {
        notificationTitle = 'Food is Ready for Pickup!';
        notificationMessage = `Your order #${orderId} at ${order.canteen_name} is packed and ready! Please proceed to the counter.`;
      }
    }

    // Insert Notification into database if applicable
    if (notificationTitle) {
      await connection.query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [order.user_id, notificationTitle, notificationMessage]
      );
    }

    await connection.commit();

    const updatedData = {
      orderId,
      previousStatus: currentStatus,
      status: targetStatus,
      points_earned: pointsEarned,
      message: notificationMessage
    };

    // Emit Real-Time Socket Events
    emitToUser(order.user_id, 'order_status_updated', updatedData);
    emitToCanteen(order.canteen_id, 'order_status_updated', updatedData);

    res.status(200).json({
      status: 'success',
      message: `Order status updated to '${targetStatus}'.`,
      data: updatedData
    });

  } catch (error) {
    await connection.rollback();
    console.error('[UpdateOrderStatus Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error updating order status.'
    });
  } finally {
    connection.release();
  }
};

// GET /api/orders/my-orders (Customer order history)
const getMyOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, c.name AS canteen_name, c.location AS canteen_location
       FROM orders o
       JOIN canteens c ON o.canteen_id = c.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    // Fetch items for these orders, including user's submitted review if any
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [items] = await pool.query(
        `SELECT oi.*, m.name, m.image_url,
                r.id AS user_review_id,
                r.rating AS user_review_rating,
                r.comment AS user_review_comment
         FROM order_items oi
         JOIN menu_items m ON oi.menu_item_id = m.id
         LEFT JOIN reviews r ON r.menu_item_id = oi.menu_item_id AND r.user_id = ?
         WHERE oi.order_id IN (?)`,
        [req.user.id, orderIds]
      );

      const itemsByOrderId = {};
      items.forEach(item => {
        item.has_reviewed = !!item.user_review_id;
        item.user_rating = item.user_review_rating !== null ? parseInt(item.user_review_rating, 10) : null;
        item.user_comment = item.user_review_comment || null;

        if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
        itemsByOrderId[item.order_id].push(item);
      });

      orders.forEach(o => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        orders
      }
    });
  } catch (error) {
    console.error('[GetMyOrders Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving orders.'
    });
  }
};

// GET /api/orders/canteen/:canteenId (Kitchen Staff & Admin order board)
const getCanteenOrders = async (req, res) => {
  try {
    const canteenId = parseInt(req.params.canteenId, 10);
    const { status } = req.query;

    let query = `
      SELECT o.*, u.name AS user_name, u.email AS user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.canteen_id = ?
    `;
    const params = [canteenId];

    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      query += ` AND o.status IN (?)`;
      params.push(statusList);
    }

    query += ' ORDER BY o.requested_pickup_time ASC, o.created_at ASC';

    const [orders] = await pool.query(query, params);

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [items] = await pool.query(
        `SELECT oi.*, m.name
         FROM order_items oi
         JOIN menu_items m ON oi.menu_item_id = m.id
         WHERE oi.order_id IN (?)`,
        [orderIds]
      );

      const itemsByOrderId = {};
      items.forEach(item => {
        if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
        itemsByOrderId[item.order_id].push(item);
      });

      orders.forEach(o => {
        o.items = itemsByOrderId[o.id] || [];
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        orders
      }
    });
  } catch (error) {
    console.error('[GetCanteenOrders Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving canteen orders.'
    });
  }
};

// GET /api/orders/:id (Single order detail)
const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const [orders] = await pool.query(
      `SELECT o.*, c.name AS canteen_name, u.name AS user_name, u.email AS user_email
       FROM orders o
       JOIN canteens c ON o.canteen_id = c.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const order = orders[0];

    // Access check: Only owner, assigned kitchen staff/local admin, or super admin can view
    if (
      req.user.role === 'user' && order.user_id !== req.user.id
    ) {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Not your order.' });
    }
    if (
      (req.user.role === 'kitchen_staff' || req.user.role === 'local_admin') &&
      req.user.canteen_id !== order.canteen_id
    ) {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Belongs to another canteen.' });
    }

    const [items] = await pool.query(
      `SELECT oi.*, m.name, m.image_url,
              r.id AS user_review_id,
              r.rating AS user_review_rating,
              r.comment AS user_review_comment
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       LEFT JOIN reviews r ON r.menu_item_id = oi.menu_item_id AND r.user_id = ?
       WHERE oi.order_id = ?`,
      [order.user_id, orderId]
    );

    items.forEach((item) => {
      item.has_reviewed = !!item.user_review_id;
      item.user_rating = item.user_review_rating !== null ? parseInt(item.user_review_rating, 10) : null;
      item.user_comment = item.user_review_comment || null;
    });

    order.items = items;

    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });
  } catch (error) {
    console.error('[GetOrderById Error]', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error retrieving order.'
    });
  }
};

module.exports = {
  createOrder,
  updateOrderStatus,
  getMyOrders,
  getCanteenOrders,
  getOrderById
};
