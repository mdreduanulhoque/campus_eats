const http = require('http');
const { pool } = require('../config/db');
const app = require('../app');
const { checkNoShowOrders } = require('../services/cronService');

function makeRequest(serverPort, method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: serverPort,
        path,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function verifyPhase4() {
  console.log('====================================================');
  console.log('        CampusEats - Phase 4 Verification Checks     ');
  console.log('====================================================\n');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let allPassed = true;
  const createdOrderIds = [];
  let testUserId = null;
  let studentToken = null;
  let kitchenToken = null;
  let adminToken = null;

  try {
    // 0. Logins
    const login = async (email) => {
      const res = await makeRequest(port, 'POST', '/api/auth/login', { email, password: 'password123' });
      return res.data?.data?.token;
    };

    studentToken = await login('student.rahim@campuseats.com');
    kitchenToken = await login('kitchen.central@campuseats.com');
    adminToken = await login('admin.central@campuseats.com');

    // Get student user info
    const meRes = await makeRequest(port, 'GET', '/api/auth/me', null, studentToken);
    const studentUser = meRes.data.data.user;
    testUserId = studentUser.id;

    // Reset student initial state: daily_budget_limit = 250.00, loyalty_points = 20, penalty_flags = 0, is_blocked = false
    await pool.query(
      'UPDATE users SET daily_budget_limit = 250.00, loyalty_points = 20, penalty_flags = 0, is_blocked = FALSE WHERE id = ?',
      [testUserId]
    );

    // Clean any existing orders for student created today to avoid leftover budget state
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [testUserId]);
    await pool.query('DELETE FROM orders WHERE user_id = ?', [testUserId]);

    // 1. Budget Guardrail Test
    process.stdout.write('[Check 1/7] Testing Daily Budget Guardrail Enforced... ');
    const futurePickup = new Date(Date.now() + 3600000).toISOString();

    // Order 1: Chicken Khichuri (Item 1, 180 BDT) -> Within 250 BDT budget
    const order1Res = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
      requested_pickup_time: futurePickup,
      points_to_redeem: 0
    }, studentToken);

    if (order1Res.status === 201) {
      createdOrderIds.push(order1Res.data.data.order.id);
    }

    // Order 2: Egg Fried Rice (Item 3, 160 BDT) -> Total 180 + 160 = 340 > 250 -> Must be blocked!
    const order2Res = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 3, quantity: 1 }],
      requested_pickup_time: futurePickup,
      points_to_redeem: 0
    }, studentToken);

    if (order1Res.status === 201 && order2Res.status === 400 && order2Res.data?.error_code === 'BUDGET_LIMIT_EXCEEDED') {
      console.log('PASSED (Order 1: 201 Created, Order 2: 400 Budget Exceeded blocked)');
    } else {
      console.log('FAILED', { order1Res, order2Res });
      allPassed = false;
    }

    // 2. Points Redemption Test
    process.stdout.write('[Check 2/7] Testing Points Redemption (1 pt = 5 BDT discount)... ');
    // Reset student points to 20, budget to 1000
    await pool.query('UPDATE users SET daily_budget_limit = 1000.00, loyalty_points = 20 WHERE id = ?', [testUserId]);
    
    // Order 3: Singara (Item 4, 20 BDT) x 2 = 40 BDT subtotal. Redeem 4 points = 20 BDT discount -> final: 20 BDT.
    const order3Res = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 4, quantity: 2 }],
      requested_pickup_time: futurePickup,
      points_to_redeem: 4
    }, studentToken);

    const [userAfterRedeem] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testUserId]);
    const remainingPoints = userAfterRedeem[0].loyalty_points;

    if (
      order3Res.status === 201 &&
      order3Res.data.data.order.total_amount === 20 &&
      order3Res.data.data.order.discount === 20 &&
      remainingPoints === 16
    ) {
      createdOrderIds.push(order3Res.data.data.order.id);
      console.log('PASSED (Subtotal: 40, Discount: 20, Total: 20 BDT, Points: 20 -> 16)');
    } else {
      console.log('FAILED', { order3Res, remainingPoints });
      allPassed = false;
    }

    // 3. Cancellation State Machine Guardrail
    process.stdout.write('[Check 3/7] Testing Cancellation Rules (Pending allowed vs Preparing blocked)... ');
    // Cancel Order 3 (in 'pending' state) -> should succeed and refund 4 redeemed points!
    const cancelRes = await makeRequest(port, 'PATCH', `/api/orders/${order3Res.data.data.order.id}/status`, {
      status: 'cancelled_by_user'
    }, studentToken);

    const [userAfterCancel] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testUserId]);
    const refundedPoints = userAfterCancel[0].loyalty_points;

    // Now test Order 1: Move from pending -> accepted -> preparing
    const order1Id = order1Res.data.data.order.id;
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'accepted' }, kitchenToken);
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'preparing' }, kitchenToken);

    // Attempt cancellation by user while 'preparing' -> Must fail with 400
    const cancelPreparingRes = await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, {
      status: 'cancelled_by_user'
    }, studentToken);

    if (
      cancelRes.status === 200 &&
      refundedPoints === 20 &&
      cancelPreparingRes.status === 400 &&
      cancelPreparingRes.data?.error_code === 'CANNOT_CANCEL_PREPARING'
    ) {
      console.log('PASSED (Pending cancel: 200 + points refunded; Preparing cancel: 400 blocked)');
    } else {
      console.log('FAILED', { cancelRes, refundedPoints, cancelPreparingRes });
      allPassed = false;
    }

    // 4. Pickup Completion & Loyalty Accrual
    process.stdout.write('[Check 4/7] Testing Picked Up Completion & Loyalty Points Accrual... ');
    // Order 1 is preparing (180 BDT). Advance preparing -> ready -> picked_up
    await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'ready' }, kitchenToken);
    const pickupRes = await makeRequest(port, 'PATCH', `/api/orders/${order1Id}/status`, { status: 'picked_up' }, kitchenToken);

    const [userAfterPickup] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testUserId]);
    // 180 BDT earns floor(180/100) = 1 point. 20 + 1 = 21 points
    const earnedPoints = pickupRes.data?.data?.points_earned;

    if (pickupRes.status === 200 && earnedPoints === 1 && userAfterPickup[0].loyalty_points === 21) {
      console.log('PASSED (Status: picked_up, Points earned: 1, Total Points: 21)');
    } else {
      console.log('FAILED', { pickupRes, userAfterPickup });
      allPassed = false;
    }

    // 5. Canteen Failure Compensation
    process.stdout.write('[Check 5/7] Testing Canteen Failure (+3 Compensation Points)... ');
    // Place a new order
    const order4Res = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 5, quantity: 1 }], // Special Milk Tea (15 BDT)
      requested_pickup_time: futurePickup,
      points_to_redeem: 0
    }, studentToken);
    const order4Id = order4Res.data.data.order.id;
    createdOrderIds.push(order4Id);

    // Kitchen marks failed_by_canteen
    const failRes = await makeRequest(port, 'PATCH', `/api/orders/${order4Id}/status`, {
      status: 'failed_by_canteen'
    }, kitchenToken);

    const [userAfterFail] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testUserId]);
    // 21 points + 3 compensation points = 24 points
    if (failRes.status === 200 && userAfterFail[0].loyalty_points === 24) {
      console.log('PASSED (Status: failed_by_canteen, Awarded 3 compensation points -> Total 24)');
    } else {
      console.log('FAILED', { failRes, userAfterFail });
      allPassed = false;
    }

    // 6. Cron Job No-Show Penalty & 3-Strike Blockade
    process.stdout.write('[Check 6/7] Testing Cron No-Show Penalty & 3-Strike Blockade... ');
    // Set student user to 2 penalty strikes
    await pool.query('UPDATE users SET penalty_flags = 2, is_blocked = FALSE WHERE id = ?', [testUserId]);

    // Create an expired ready order: requested_pickup_time was 45 minutes ago
    const pastPickup = new Date(Date.now() - 45 * 60000).toISOString().slice(0, 19).replace('T', ' ');
    const [expiredOrderResult] = await pool.query(
      `INSERT INTO orders (user_id, canteen_id, total_amount, points_redeemed, points_earned, status, requested_pickup_time)
       VALUES (?, 1, 150.00, 0, 0, 'ready', ?)`,
      [testUserId, pastPickup]
    );
    const expiredOrderId = expiredOrderResult.insertId;
    createdOrderIds.push(expiredOrderId);

    // Run cron handler directly
    const cronResult = await checkNoShowOrders();

    const [blockedUser] = await pool.query('SELECT penalty_flags, is_blocked FROM users WHERE id = ?', [testUserId]);
    const [orderAfterCron] = await pool.query('SELECT status FROM orders WHERE id = ?', [expiredOrderId]);

    // Blocked user tries to place an order -> Must be rejected with 403
    const blockedOrderAttempt = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
      requested_pickup_time: futurePickup,
      points_to_redeem: 0
    }, studentToken);

    if (
      orderAfterCron[0].status === 'no_show' &&
      blockedUser[0].penalty_flags === 3 &&
      blockedUser[0].is_blocked === 1 &&
      blockedOrderAttempt.status === 403
    ) {
      console.log('PASSED (Order marked no_show, Strikes: 3, User is_blocked: true, New orders: 403 Forbidden)');
    } else {
      console.log('FAILED', { cronResult, blockedUser, orderAfterCron, blockedOrderAttempt });
      allPassed = false;
    }

    // 7. Local Admin Unblock & Analytics
    process.stdout.write('[Check 7/7] Testing Local Admin Unblock & Canteen Analytics... ');
    const unblockRes = await makeRequest(port, 'PATCH', `/api/admin/users/${testUserId}/unblock`, null, adminToken);
    const [unblockedUser] = await pool.query('SELECT penalty_flags, is_blocked FROM users WHERE id = ?', [testUserId]);

    const analyticsRes = await makeRequest(port, 'GET', '/api/admin/analytics/1', null, adminToken);

    if (
      unblockRes.status === 200 &&
      unblockedUser[0].is_blocked === 0 &&
      unblockedUser[0].penalty_flags === 0 &&
      analyticsRes.status === 200 &&
      analyticsRes.data?.data?.overview?.total_completed_orders >= 1
    ) {
      console.log(`PASSED (User unblocked, strikes reset to 0. Analytics: ${analyticsRes.data.data.overview.total_completed_orders} completed order(s))`);
    } else {
      console.log('FAILED', { unblockRes, unblockedUser, analyticsRes });
      allPassed = false;
    }

  } catch (error) {
    console.error('Fatal Phase 4 verification error:', error);
    allPassed = false;
  } finally {
    // Cleanup created test orders
    if (createdOrderIds.length > 0) {
      await pool.query('DELETE FROM order_items WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM orders WHERE id IN (?)', [createdOrderIds]);
    }
    // Reset test user
    if (testUserId) {
      await pool.query(
        'UPDATE users SET daily_budget_limit = 400.00, loyalty_points = 30, penalty_flags = 0, is_blocked = FALSE WHERE id = ?',
        [testUserId]
      );
    }
    testServer.close();
    await pool.end();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('    SUCCESS: ALL PHASE 4 CHECKS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('    FAILURE: SOME CHECKS FAILED');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyPhase4().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
