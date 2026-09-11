const http = require('http');
const { pool } = require('../config/db');
const app = require('../app');
const { server } = require('../server');
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

async function runE2ETests() {
  console.log('================================================================');
  console.log('       CampusEats - Phase 6 End-to-End & Guardrail Suite        ');
  console.log('================================================================\n');

  // Start server on dynamic port
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;

  let totalTests = 0;
  let passedTests = 0;
  const createdOrderIds = [];
  let testStudentId = null;

  function assert(name, condition, details = null) {
    totalTests++;
    process.stdout.write(`[Test ${totalTests}] ${name}... `);
    if (condition) {
      passedTests++;
      console.log('PASSED');
    } else {
      console.log('FAILED');
      if (details) console.error('   Details:', details);
    }
  }

  try {
    // -----------------------------------------------------------------
    // Setup Tokens
    // -----------------------------------------------------------------
    const login = async (email) => {
      const res = await makeRequest(port, 'POST', '/api/auth/login', { email, password: 'password123' });
      return res.data?.data?.token;
    };

    const studentToken = await login('student.rahim@campuseats.com');
    const facultyToken = await login('faculty.tanvir@campuseats.com');
    const kitchen1Token = await login('kitchen.central@campuseats.com');
    const kitchen2Token = await login('kitchen.science@campuseats.com');
    const admin1Token = await login('admin.central@campuseats.com');
    const superAdminToken = await login('superadmin@campuseats.com');

    const meRes = await makeRequest(port, 'GET', '/api/auth/me', null, studentToken);
    testStudentId = meRes.data.data.user.id;

    // Reset student initial state
    await pool.query(
      'UPDATE users SET daily_budget_limit = 500.00, loyalty_points = 50, penalty_flags = 0, is_blocked = FALSE WHERE id = ?',
      [testStudentId]
    );
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [testStudentId]);
    await pool.query('DELETE FROM orders WHERE user_id = ?', [testStudentId]);

    // -----------------------------------------------------------------
    // SUITE 1: Role-Based Authorization Guardrails
    // -----------------------------------------------------------------
    console.log('\n--- Suite 1: RBAC & Tenant Boundary Guardrails ---');

    // Test 1.1: Missing token
    const noToken = await makeRequest(port, 'GET', '/api/orders/my-orders');
    assert('Reject unauthenticated request with 401', noToken.status === 401);

    // Test 1.2: Student cannot access kitchen orders
    const studentAsKitchen = await makeRequest(port, 'GET', '/api/orders/canteen/1', null, studentToken);
    assert('Reject student accessing kitchen orders with 403', studentAsKitchen.status === 403);

    // Test 1.3: Student cannot access admin routes
    const studentAsAdmin = await makeRequest(port, 'GET', '/api/admin/users/penalized', null, studentToken);
    assert('Reject student accessing admin portal with 403', studentAsAdmin.status === 403);

    // Test 1.4: Kitchen staff cannot create canteens
    const kitchenCreateCanteen = await makeRequest(port, 'POST', '/api/canteens', { name: 'X' }, kitchen1Token);
    assert('Reject kitchen staff creating canteen with 403', kitchenCreateCanteen.status === 403);

    // Test 1.5: Local Admin cross-canteen guard
    const admin1CrossEdit = await makeRequest(port, 'GET', '/api/admin/analytics/2', null, admin1Token);
    assert('Reject Local Admin 1 managing Canteen 2 analytics with 403', admin1CrossEdit.status === 403);

    // -----------------------------------------------------------------
    // SUITE 2: The Budget Guardrail Engine
    // -----------------------------------------------------------------
    console.log('\n--- Suite 2: The Daily Budget Guardrail ---');

    // Set budget to 300 BDT
    await pool.query('UPDATE users SET daily_budget_limit = 300.00 WHERE id = ?', [testStudentId]);
    const futureTime = new Date(Date.now() + 3600000).toISOString();

    // Order of 180 BDT (Chicken Khichuri) -> Allowed (180 <= 300)
    const budgetOrder1 = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);
    createdOrderIds.push(budgetOrder1.data.data.order.id);

    assert('Order 1 within daily budget limit succeeds (201)', budgetOrder1.status === 201);

    // Order 2 of 160 BDT -> Today's spent 180 + 160 = 340 > 300 -> MUST BE BLOCKED
    const budgetOrder2 = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 3, quantity: 1 }],
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);

    assert(
      'Order 2 exceeding daily budget is blocked (HTTP 400, BUDGET_LIMIT_EXCEEDED)',
      budgetOrder2.status === 400 && budgetOrder2.data?.error_code === 'BUDGET_LIMIT_EXCEEDED'
    );

    // -----------------------------------------------------------------
    // SUITE 3: Loyalty Points Mathematics
    // -----------------------------------------------------------------
    console.log('\n--- Suite 3: Loyalty Points Math (Redeem, Earn, Compensate) ---');

    // Give user 20 points, budget 1000
    await pool.query('UPDATE users SET daily_budget_limit = 1000.00, loyalty_points = 20 WHERE id = ?', [testStudentId]);

    // Order 3: 40 BDT subtotal. Redeem 4 points (20 BDT discount). Total = 20 BDT.
    const loyaltyOrder = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 4, quantity: 2 }], // 2x Singara @ 20 = 40 BDT
      requested_pickup_time: futureTime,
      points_to_redeem: 4
    }, studentToken);
    createdOrderIds.push(loyaltyOrder.data.data.order.id);

    const [userAfterRedeem] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testStudentId]);

    assert(
      'Points redemption deducted correctly (20 pts -> 16 pts, Total: 20 BDT)',
      loyaltyOrder.status === 201 &&
      loyaltyOrder.data.data.order.discount === 20 &&
      loyaltyOrder.data.data.order.total_amount === 20 &&
      userAfterRedeem[0].loyalty_points === 16
    );

    // Cancel order 3 while pending -> points refunded
    const cancelLoyaltyOrder = await makeRequest(port, 'PATCH', `/api/orders/${loyaltyOrder.data.data.order.id}/status`, {
      status: 'cancelled_by_user'
    }, studentToken);

    const [userAfterRefund] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testStudentId]);
    assert('Cancelled pending order refunds redeemed points (16 pts -> 20 pts)', userAfterRefund[0].loyalty_points === 20);

    // Order 4: 220 BDT (Beef Tehari). Advance to picked_up -> User earns floor(220 / 100) = 2 points
    const earnOrder = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 2, quantity: 1 }], // 220 BDT
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);
    const earnOrderId = earnOrder.data.data.order.id;
    createdOrderIds.push(earnOrderId);

    await makeRequest(port, 'PATCH', `/api/orders/${earnOrderId}/status`, { status: 'accepted' }, kitchen1Token);
    await makeRequest(port, 'PATCH', `/api/orders/${earnOrderId}/status`, { status: 'preparing' }, kitchen1Token);
    await makeRequest(port, 'PATCH', `/api/orders/${earnOrderId}/status`, { status: 'ready' }, kitchen1Token);
    const pickupRes = await makeRequest(port, 'PATCH', `/api/orders/${earnOrderId}/status`, { status: 'picked_up' }, kitchen1Token);

    const [userAfterEarn] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testStudentId]);
    assert(
      'Pickup completion earns floor(Total / 100) points (20 + 2 = 22 pts)',
      pickupRes.status === 200 && userAfterEarn[0].loyalty_points === 22
    );

    // Order 5: Canteen failure awards +3 compensation points
    const failOrder = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 5, quantity: 1 }],
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);
    const failOrderId = failOrder.data.data.order.id;
    createdOrderIds.push(failOrderId);

    const failStatusRes = await makeRequest(port, 'PATCH', `/api/orders/${failOrderId}/status`, {
      status: 'failed_by_canteen'
    }, kitchen1Token);

    const [userAfterComp] = await pool.query('SELECT loyalty_points FROM users WHERE id = ?', [testStudentId]);
    assert(
      'Canteen failure automatically awards +3 compensation points (22 + 3 = 25 pts)',
      failStatusRes.status === 200 && userAfterComp[0].loyalty_points === 25
    );

    // -----------------------------------------------------------------
    // SUITE 4: Order State Machine & Cancellation Lock
    // -----------------------------------------------------------------
    console.log('\n--- Suite 4: Order State Machine & Cancellation Lock ---');

    const lockOrder = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);
    const lockOrderId = lockOrder.data.data.order.id;
    createdOrderIds.push(lockOrderId);

    // Advance to preparing
    await makeRequest(port, 'PATCH', `/api/orders/${lockOrderId}/status`, { status: 'accepted' }, kitchen1Token);
    await makeRequest(port, 'PATCH', `/api/orders/${lockOrderId}/status`, { status: 'preparing' }, kitchen1Token);

    // Attempt cancellation while preparing -> MUST BE BLOCKED
    const illegalCancel = await makeRequest(port, 'PATCH', `/api/orders/${lockOrderId}/status`, {
      status: 'cancelled_by_user'
    }, studentToken);

    assert(
      'Cancellation is locked once kitchen starts preparing (HTTP 400, CANNOT_CANCEL_PREPARING)',
      illegalCancel.status === 400 && illegalCancel.data?.error_code === 'CANNOT_CANCEL_PREPARING'
    );

    // -----------------------------------------------------------------
    // SUITE 5: Cron Job No-Show Penalty & 3-Strike Blockade
    // -----------------------------------------------------------------
    console.log('\n--- Suite 5: Cron No-Show Penalty & Blockade System ---');

    // Set user to 2 penalty strikes
    await pool.query('UPDATE users SET penalty_flags = 2, is_blocked = FALSE WHERE id = ?', [testStudentId]);

    // Insert an expired order (requested pickup was 40 minutes ago)
    const pastTime = new Date(Date.now() - 40 * 60000);
    const [expiredRow] = await pool.query(
      `INSERT INTO orders (user_id, canteen_id, total_amount, points_redeemed, points_earned, status, requested_pickup_time)
       VALUES (?, 1, 100.00, 0, 0, 'ready', ?)`,
      [testStudentId, pastTime]
    );
    const expiredId = expiredRow.insertId;
    createdOrderIds.push(expiredId);

    // Run cron handler
    await checkNoShowOrders();

    const [userAfterCron] = await pool.query('SELECT penalty_flags, is_blocked FROM users WHERE id = ?', [testStudentId]);
    const [orderStatusAfterCron] = await pool.query('SELECT status FROM orders WHERE id = ?', [expiredId]);

    assert(
      'Expired ready order transitioned to no_show and user reached 3 strikes',
      orderStatusAfterCron[0].status === 'no_show' && userAfterCron[0].penalty_flags === 3
    );

    assert(
      '3 strikes triggers is_blocked = TRUE',
      userAfterCron[0].is_blocked === 1
    );

    // Blocked user attempts to place an order -> MUST BE REJECTED
    const blockedOrderAttempt = await makeRequest(port, 'POST', '/api/orders', {
      canteen_id: 1,
      items: [{ menu_item_id: 1, quantity: 1 }],
      requested_pickup_time: futureTime,
      points_to_redeem: 0
    }, studentToken);

    assert(
      'Blocked user is forbidden from placing new orders (HTTP 403 Forbidden)',
      blockedOrderAttempt.status === 403
    );

    // Local Admin unblocks user
    const unblockRes = await makeRequest(port, 'PATCH', `/api/admin/users/${testStudentId}/unblock`, null, admin1Token);
    const [userAfterUnblock] = await pool.query('SELECT penalty_flags, is_blocked FROM users WHERE id = ?', [testStudentId]);

    assert(
      'Local Admin unblock clears penalty flags and restores ordering status',
      unblockRes.status === 200 && userAfterUnblock[0].is_blocked === 0 && userAfterUnblock[0].penalty_flags === 0
    );

    // -----------------------------------------------------------------
    // SUITE 6: Sales Analytics & Canteen Reporting
    // -----------------------------------------------------------------
    console.log('\n--- Suite 6: Canteen Sales Analytics ---');

    const analyticsRes = await makeRequest(port, 'GET', '/api/admin/analytics/1', null, admin1Token);
    assert(
      'Analytics returns revenue, status counts, peak hours, and top items',
      analyticsRes.status === 200 &&
      typeof analyticsRes.data.data.overview.total_revenue === 'number' &&
      Array.isArray(analyticsRes.data.data.orders_by_status) &&
      Array.isArray(analyticsRes.data.data.peak_hours)
    );

  } catch (err) {
    console.error('Fatal error during E2E test run:', err);
  } finally {
    // Cleanup created test records
    if (createdOrderIds.length > 0) {
      await pool.query('DELETE FROM order_items WHERE order_id IN (?)', [createdOrderIds]);
      await pool.query('DELETE FROM orders WHERE id IN (?)', [createdOrderIds]);
    }
    if (testStudentId) {
      await pool.query(
        'UPDATE users SET daily_budget_limit = 400.00, loyalty_points = 30, penalty_flags = 0, is_blocked = FALSE WHERE id = ?',
        [testStudentId]
      );
    }
    testServer.close();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`  E2E TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests && totalTests > 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Unexpected test exception:', err);
  process.exit(1);
});
